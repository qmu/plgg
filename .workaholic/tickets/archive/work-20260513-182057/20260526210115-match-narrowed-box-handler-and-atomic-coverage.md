---
created_at: 2026-05-26T21:01:15+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 4h
commit_hash: 49a960c
category: Changed
depends_on:
---

# Give `match` tag/icon handlers the narrowed box and fix `never` coverage for atomic/array-content variant unions

## Overview

Dogfooding `match` against a payload-carrying `Box` union in the `plgg-web` package surfaced two distinct type-level defects in the core `match` machinery (`src/plgg/src/Flowables/match.ts`). The concrete repro folds the `HttpError` union
(`Box<"NotFound", SoftStr> | Box<"MethodNotAllowed", ReadonlyArray<Method>> | Box<"BadRequest", SoftStr> | Box<"Unsupported", SoftStr> | Box<"InternalError", SoftStr>`)
with five tag patterns and a content-reading handler per arm. It fails to compile two ways (both reproduced verbatim against the current tree):

1. **TS18048 "'e' is possibly 'undefined'" (x3).** A tag/icon pattern's handler is typed `(a: PBODY) => R` where `PBODY = ExtractBodyFromBoxPattern<PATTERN>` resolves to `undefined` for a tag-only pattern (`PatternIcon.body: undefined`). So handlers cannot read the matched box's `.content`, even though the runtime ALREADY calls `fn(a)` with the full box (see `match.ts` lines 1295-1302). This is a type-level-only gap.

2. **TS2345 "HttpError is not assignable to 'never'".** `ArgMatchable` collapses to `never` for five tag patterns that fully cover the five-variant union, whereas the existing `match.spec.ts` "Variant1" case (three boxes with OBJECT content) compiles. The coverage/exhaustiveness path is inconsistent for variants whose content is atomic (`string`) or array (`ReadonlyArray<Method>`) rather than an object.

The goal is to (a) type a tag/icon pattern's handler as the narrowed box so `.content` is readable and typed, and (b) make full-coverage tag matching over atomic/array-content unions type-check — without any `as` / `any` / `@ts-ignore`, and without regressing the existing `match` test suites.

## Key Files

- `src/plgg/src/Flowables/match.ts` - Houses `CaseDecl` (lines 153-175, where the handler arg `(a: PBODY) => R` is computed) and `ArgMatchable` (lines 35-80) with its helpers `FullCoveragedBoxes`, `AreAllTagPatterns`, `IsAllBoxPattern`, `ExtractBoxTag`, `ExtractPatternTags`, `ExtractBoxContent`. Both fixes live here. The 19 arity overloads (P1~P2 … P1~P20) consume `CaseDecl`/`ArgMatchable` uniformly; the runtime impl (lines 1268-1318) already passes the full box to `fn` and is unchanged by this work.
- `src/plgg/src/Contextuals/Pattern.ts` - `pattern()` factory and the three shapes (`PatternAtomic`, `PatternBoxedObject`, `PatternIcon`), the `IsPattern*` predicates, and `ExtractBodyFromBoxPattern`. A tag-only `pattern("NotFound")()` resolves to `PatternIcon` with `body: undefined`, which is why `PBODY` is `undefined` today (bug 1) and what `ArgMatchable`'s box-coverage branch must classify (bug 2).
- `src/plgg/src/Contextuals/Box.ts` - `Box<TAG, CONTENT>` shape (`{ __tag; content }`) and `IsBox`. The handler narrowing must produce `Extract<A, Box<T, unknown>>`.
- `src/plgg/src/Contextuals/Icon.ts` - `Icon`/`IsIcon`; relevant because `CaseDecl`'s first guard is `Or<IsBox<A>, IsIcon<A>>`.
- `src/plgg/src/Grammaticals/BoolAlgebra.ts` - `If`, `Is`, `IsEqual`, `And`, `Or`, `TupleToUnion`, `IsUnionSubset`. The coverage logic is assembled from these; `IsUnionSubset<A, B> = [Exclude<A, B>] extends [never] ? true : false`.
- `src/plgg/src/Disjunctives/Atomic.ts` - `Atomic` and `IsAtomic<T> = [T] extends [Atomic] ? true : false`. Relevant to diagnosing why atomic content (`SoftStr`) routes differently than object content.
- `src/plgg/src/Flowables/match.spec.ts` - Behavioral guardrail. "Variant1" (object content) must keep compiling; add a payload-carrying tag-union fold (atomic + array content) that reads `.content` per arm.
- `src/plgg/src/Flowables/match.completeness.spec.ts` - Type-level characterization guardrail. These assertions PIN current behavior; the ones touching the fixed paths must be updated to reflect the new (correct) behavior, making the change explicit in the diff.
- `src/plgg/docs/match-type-completeness.md` - The gap analysis this ticket extends. Update the relevant gap entries (notably the `CaseDecl` body/handler discussion and the box-coverage branch) once the fixes land.
- `src/plgg-web/src/Http/model/HttpError.ts` - Source of the dogfooding repro (`httpErrorToResponse`, lines 65-81, currently a hand-rolled ternary chain). Out of scope to refactor here; included only as the acceptance reference.

## Related History

This is the implementation follow-up to a recently-completed analysis ticket that explicitly shipped no fixes; it deepens the same `match` type-machinery lineage, so it is a clear (non-duplicate) addition.

Past tickets that touched this area:

- [20260525205926-match-type-completeness-gap-analysis.md](.workaholic/tickets/archive/work-20260513-182057/20260525205926-match-type-completeness-gap-analysis.md) - Produced `docs/match-type-completeness.md`, the `match.completeness.spec.ts` characterization tests, and exported `ArgMatchable`. That ticket was identification + proposal only ("does NOT mandate shipping every fix"); this ticket ships two of the surfaced fixes (same file `match.ts`, same guardrail specs).

## Implementation Steps

1. **Reproduce both errors as a baseline.** A minimal `match(error, [pattern("NotFound")(), () => ...], [pattern("MethodNotAllowed")(), (e) => e.content.join(", ")], ...)` over the `HttpError`-shaped union compiles to exactly: `TS2345 ... not assignable to 'never'` on the matched value, plus `TS18048 'e' is possibly 'undefined'` on each `.content`-reading handler. Confirm these before changing anything (a throwaway type-level probe under `src/plgg/src` checked with `sh/tsc-plgg.sh`, then deleted).

2. **Fix bug 1 — narrow the handler arg to the matched box.** In `CaseDecl` (`match.ts` lines 153-175), for the boxed-input arm where `PATTERN` is an icon/tag pattern matching tag `T` against box union `A`, type the handler as `(a: Extract<A, Box<T, unknown>>) => R` (the narrowed box, whose `.content` is the variant's typed content) instead of `(a: PBODY) => R`. The matched tag `T` comes from the pattern's `__tag` (a `PatternIcon<T>` carries `__tag: T`); reuse the existing tag-extraction shape (`ExtractIconTag`-style) rather than `ExtractBodyFromBoxPattern`. Preserve the existing arms: atomic/object-body patterns keep validating `PBODY` against `ABODY`, and the non-box fallthrough `[PATTERN, (a: PATTERN) => R]` is unchanged. The runtime is NOT touched (it already calls `fn(a)` with the full box).

3. **Diagnose bug 2 — why atomic/array content collapses to `never`.** Trace `ArgMatchable` for the 5-tag-pattern `HttpError` case through `IsAllBoxPattern` -> `FullCoveragedBoxes` -> `AreAllTagPatterns` + `IsUnionSubset<ExtractBoxTag<A>, TupleToUnion<ExtractPatternTags<PATTERNS>>>`. Determine the exact predicate that diverges between object-content variants (Variant1, which compiles) and atomic/array-content variants (which yield `never`). The tag-coverage path is nominally content-agnostic, so the divergence is in how inline-inferred patterns are classified (`IsPattern`/`IsPatternIcon` over the inferred `Pn`) and/or how `ExtractBoxContent`/`ABODY` distributes over a union whose members carry atomic vs object content. Pin the offending predicate with a `IsEqual`-based assertion before fixing.

4. **Fix bug 2 — make full-coverage tag matching over atomic/array-content unions type-check.** Adjust the box-coverage classification/extraction so that a set of tag patterns whose `__tag`s form a superset of `ExtractBoxTag<A>` proves coverage regardless of whether each variant's content is atomic, array, or object. Keep the change inside the box-coverage helpers (`FullCoveragedBoxes`/`AreAllTagPatterns`/`ExtractBoxTag`/`ExtractPatternTags` or `ExtractBoxContent`), and ensure it does not loosen genuine non-exhaustive cases (a missing tag must still collapse to `never`).

5. **Apply consistently across all 19 arity overloads.** `CaseDecl`/`ArgMatchable` are referenced identically by every overload (P1~P2 … P1~P20), so a change confined to those two types propagates without editing each overload. If any overload-local derivation must change, apply it uniformly and verify overload inference is unchanged (overload selection is sensitive to default type-parameter shapes).

6. **Update the guardrails.**
   - `match.spec.ts`: add a behavioral test that folds a payload-carrying tag union (mix of atomic and `ReadonlyArray` content) via `match`, reading `e.content` in at least the atomic and array arms, asserting runtime results. Keep "Variant1" and all existing cases passing.
   - `match.completeness.spec.ts`: update the characterization assertions on the paths these fixes change (the `CaseDecl` handler-body discussion and the box-coverage branch) so the corrected behavior is asserted positively; leave unrelated gap pins intact.
   - `docs/match-type-completeness.md`: revise the affected gap entries to record that the handler now receives the narrowed box and that atomic/array-content tag unions now prove coverage.

7. **Verify acceptance.** The `httpErrorToResponse`-style fold compiles with no `as`/`any`/`@ts-ignore`; tag/icon handlers receive the narrowed box with a typed `.content`; full-coverage tag matching over atomic-content unions type-checks; and all existing `match` tests still pass. Run `sh/tsc-plgg.sh` (must exit 0) and `sh/test-plgg.sh`, keeping coverage above the strict >90% thresholds.

## Patches

> **Note**: These patches are speculative — they sketch the intended direction for bug 1 and the new test. The exact extraction helpers (and the bug-2 fix, which depends on the step-3 diagnosis) must be settled during implementation. Do not apply blindly.

### `src/plgg/src/Flowables/match.ts`

```diff
@@ export type CaseDecl<
   A,
   PATTERN,
   R,
   ABODY = A extends Box<string, unknown>
     ? ExtractBoxContent<A>
     : never,
   PBODY = ExtractBodyFromBoxPattern<PATTERN>,
 > = If<
   And<
     Or<IsBox<A>, IsIcon<A>>,
     IsPattern<PATTERN>
   >,
-  If<
-    Or<
-      Is<PBODY, undefined>,
-      Or<Is<PBODY, ABODY>, Is<ABODY, PBODY>>
-    >,
-    [PATTERN, (a: PBODY) => R],
-    never
-  >,
+  If<
+    IsPatternIcon<PATTERN>,
+    // Tag/icon pattern: hand the handler the narrowed box so `.content` is typed.
+    [PATTERN, (a: Extract<A, Box<ExtractPatternTag<PATTERN>, unknown>>) => R],
+    If<
+      Or<
+        Is<PBODY, undefined>,
+        Or<Is<PBODY, ABODY>, Is<ABODY, PBODY>>
+      >,
+      [PATTERN, (a: PBODY) => R],
+      never
+    >
+  >,
   [PATTERN, (a: PATTERN) => R]
 >;
+
+/**
+ * Extracts the literal tag of a tag/icon pattern.
+ */
+type ExtractPatternTag<PATTERN> = PATTERN extends {
+  __tag: infer T;
+  type: "tag";
+}
+  ? T
+  : never;
```

### `src/plgg/src/Flowables/match.spec.ts`

```diff
@@ test("Variant1", async () => {
 });
+
+test("Variant payload fold (atomic + array content) reads narrowed .content", async () => {
+  type Found = Box<"Found", string>;
+  type Allowed = Box<"Allowed", ReadonlyArray<string>>;
+  type Plain = Box<"Plain", string>;
+  type E = Found | Allowed | Plain;
+
+  const e = (a: E): string =>
+    match(
+      a,
+      [pattern("Found")(), (b) => `found:${b.content}`],
+      [pattern("Allowed")(), (b) => `allow:${b.content.join(",")}`],
+      [pattern("Plain")(), (b) => `plain:${b.content}`],
+    );
+
+  expect(e(box("Allowed")(["GET", "POST"]))).equal("allow:GET,POST");
+  expect(e(box("Found")("x"))).equal("found:x");
+});
```

## Considerations

- **Hard constraint — no type escape hatches.** Every change and every test must compile without `as`, `any`, or `@ts-ignore`/`@ts-expect-error`. Negative type assertions use the `const _x: Cond = true` + `expect` pattern, not `// @ts-expect-error` (`.workaholic/constraints/quality.md` Type Escape Prohibition; `CLAUDE.md`).
- **Strict compiler flags are fixed.** The fix must hold under `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `isolatedModules` — none may be relaxed (`.workaholic/constraints/quality.md` and `.workaholic/constraints/architecture.md` TypeScript Strictness Configuration). `erasableSyntaxOnly` constrains any runtime-side change (none is expected — the runtime already passes the full box).
- **Type-driven design lens (`standards:leading-validity`).** Push the narrowing into the type layer so a tag handler statically receives the correct box variant and illegal coverage stays unrepresentable; avoid widening the handler arg to `Box<string, unknown>` or to the whole union when a single variant is matched. Preserve layer segregation — this is pure plgg core type machinery (Domain), not plgg-web.
- **Do not loosen genuine exhaustiveness.** The bug-2 fix must keep collapsing to `never` when a tag is missing or a foreign tag is supplied; only fully-covered atomic/array-content unions should newly type-check. Pin both the positive (covered -> union) and negative (missing tag -> `never`) directions in `match.completeness.spec.ts` (`src/plgg/src/Flowables/match.ts` lines 35-98).
- **Characterization specs PIN current behavior intentionally.** `match.completeness.spec.ts` asserts the *current* (buggy) results; the assertions on the changed paths must be flipped to the corrected behavior in the same diff, per that file's own header note (lines 11-26). Leave unrelated gap pins untouched.
- **Apply uniformly across overloads.** Confining the change to `CaseDecl`/`ArgMatchable` propagates to all 19 arity overloads automatically; verify no overload's default type-parameter shape (`OTHERWISE_LAST`/`PATTERNS` derivation) needs editing, since overload inference is sensitive to those (`src/plgg/src/Flowables/match.ts` lines 188-1263).
- **Public API surface.** Any new exported type helper (e.g. an `ExtractPatternTag`) must reach the root barrel `src/plgg/src/index.ts`, consistent with how `match.ts` already imports its helpers via `plgg/index` (`.workaholic/constraints/architecture.md` Module Export Convention). New helpers belong in `Flowables/match.ts` or an existing category — do not add a new top-level category (`.workaholic/constraints/architecture.md` plgg Category Taxonomy).
- **Coverage thresholds (>90%).** Type-only changes do not move runtime coverage, but the new behavioral test in `match.spec.ts` must exercise the box-content read paths and must not regress the strict statements/branches/functions/lines thresholds (`src/plgg/vite.config.ts`; user memory: coverage must exceed 90%).
- **Out of scope.** Refactoring `httpErrorToResponse` / plgg-web to actually use `match` is a deliberate follow-up once core supports the fold (`src/plgg-web/src/Http/model/HttpError.ts` lines 65-81). This ticket only fixes the core type machinery and proves it with the acceptance repro.

## Final Report

Development completed, but the diagnosis overturned the ticket's premise and the fix required an API-shape change (accepted by the maintainer since plgg is pre-1.0). A third-party advisor (Codex) was consulted and independently confirmed the root cause and supplied the decisive narrowing technique.

**What shipped:**
- `match` is now **curried** — `match(value)(...cases)`. The continuation carries the 19 arity overloads.
- `CaseDecl` types tag/icon handlers as `(a: Extract<A, Box<TAG, unknown>>) => R`, where `TAG extends string = ExtractPatternTag<PATTERN>` is a defaulted (non-inference) generic; the branch is gated on `Or<IsBox<A>, IsIcon<A>>` and `otherwise` is special-cased to receive the whole value.
- Non-exhaustive cases now yield a `CoverageError<A>` **return type** (exported alongside `MatchCont<A>`). `ArgMatchable` is unchanged.
- Migrated `match.spec.ts` (+ added a payload-fold test reading typed `.content`), the one production call (`plgg-kit/.../generateObject.ts`), and updated `docs/match-type-completeness.md`.

### Discovered Insights

- **Insight**: Handler-narrowing and value-arg exhaustiveness are irreconcilable in a single positional `match(a, ...cases)` call.
  **Context**: TypeScript runs inference once per call expression; `A` buried inside `ArgMatchable<…A>` is non-inferable for box unions, and every workaround to make `A` inferable (`A & ArgMatchable<…A>`, guard rest-param, `NoInfer`) either self-references or is defeated by arity being fixed pre-inference. Currying is the structural fix — two call expressions = two inference rounds.

- **Insight**: The "atomic coverage collapses to `never`" item (the ticket's bug 2) was **not** an `ArgMatchable` defect.
  **Context**: It was a cascade of the handler-argument inference poisoning. Once `A` is fixed (curried) and the handler arg no longer back-infers `PATTERN`, `ArgMatchable` evaluates coverage correctly with no change. The gap analysis's gaps 1–8 are about `ArgMatchable` and remain open.

- **Insight**: A *defaulted* type parameter is not an inference site — this is the lever that severs unwanted back-inference.
  **Context**: Typing the handler from `TAG = ExtractPatternTag<PATTERN>` (a defaulted generic) instead of inline keeps `PATTERN` inferable solely from the pattern argument. A readability refactor (hoisting the same expression into a shared `Matched<…>` alias) silently broke 3-arity coverage — the inline form must be kept per overload.

- **Insight**: Rejection now lands on the **result's use**, not the call.
  **Context**: A non-exhaustive `match(...)( ...)` returns `CoverageError<A>`; the error appears where the result is assigned/used. For value-returning matches (all current usage) this is equivalent to the old value-arg error; a match whose result is entirely discarded would not flag.
