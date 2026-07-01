---
created_at: 2026-06-02T01:31:18+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash: ccc343b
category: Added
depends_on:
---

# plgg-view: typed content-model constraints (agent-legible child & arity restriction)

## Overview

Give the plgg-view `Html` view tree a **type-level content model** so that
illegal child structures are compile errors, not runtime bugs. Today every
builder (`ul`, `li`, `div`, `span`, …) returns the same `Html<Msg>` and accepts
`ReadonlyArray<Html<Msg>>` children — the tag is only a `SoftStr` field inside
the `Box`, so `ul([], [div([], [])])` type-checks even though it is invalid
HTML.

The change adds a **second type parameter** to `Html<Msg, T>` where `T` brands
the element's tag (the tag is *already stored as data*, so the brand is real,
not phantom — no cast needed). Builders then declare **what they are** (branded
return type) and **what they accept** (children parameter typed by content
category and/or cardinality). The runtime payload is unchanged.

Two independent axes of constraint:

1. **Which children** — element type. `ul` accepts only `li`; `span` accepts
   only phrasing content; `el` stays the permissive escape hatch.
2. **How many** — cardinality. Exactly-one via a single-value parameter,
   fixed/ordered arity via tuples, non-empty via a head+rest tuple, void
   (zero) via an empty tuple, unbounded via the array form.

The headline: restriction is **producer-side** — a value's own type says
`Html<Msg, "li">`, so *every* container that accepts `li` enforces it
automatically, and a **custom component opts into a strict slot by simply
declaring what it is / what it accepts**. This is the deliberate difference
from React/TSX, where the same constraint is consumer-side, partial (intrinsic
elements collapse to `ReactNode`), and arity-blind.

**Why (policy):** this is `standards:implementation` type-driven-design made
concrete — "the compiler is AI's most accurate and cheapest feedback path." It
moves a class of structural correctness from runtime/review onto the type, which
matters doubly for an agent whose inner loop is edit → `tsc` → fix. It must be
applied *selectively* (the same policy's paired constraint), not as a full HTML
content-model lattice.

The design below was prototyped standalone and verified to pass `tsc --strict`
cast-free, with only the intended rejections (see Patches and Considerations).

## Key Files

- `packages/plgg-view/src/Html/model/Html.ts` — PRIMARY. Add `T extends string
  = string` to `Html<Msg, T>` and `ElementContent<Msg, T>` (`tag: T`). The
  default is what keeps bare `Html<Msg>` valid for every downstream consumer.
- `packages/plgg-view/src/Html/model/element.ts` — PRIMARY. Retype every
  builder. Replace the single `tag(name)` factory with a small set of
  category-keyed factories (each pins the tag literal via an explicit content
  type so it is cast-free). Keep `el` permissive. Add cardinality type aliases.
- `packages/plgg-view/src/Html/model/index.ts` / `src/Html/index.ts` /
  `src/index.ts` — export the new content-category and cardinality type aliases.
- `packages/plgg-view/src/Html/usecase/mapHtml.ts`, `foldHtml.ts`,
  `renderToString.ts` — CONSUMERS. Must keep operating on uniform `Html<Msg>`
  (T erased). They should need *no* change beyond `Html<Msg>` continuing to mean
  `Html<Msg, string>`; verify they still compile and that `mapHtml`'s rebuilt
  node (default-T) is fine.
- `packages/plgg-view/src/Program/usecase/render.ts`, `sandbox.ts`,
  `application.ts` — CONSUMERS. The diff/patch renderer reads
  `ElementContent.children` positionally and homogeneously; this is the hard
  reason children must stay uniform at the data layer. `view: (model) =>
  Html<Msg>` must keep accepting branded builder output.
- `packages/plgg-view/src/Html/model/element.spec.ts` — add positive +
  type-level negative tests for the new constraints.
- `packages/plgg-view/vite.config.ts` — coverage thresholds (91). New builder
  branches in `element.ts` are not excluded, so each must be exercised.
- `packages/plgg-view/.prettierrc.json` — printWidth 50; hand-format the tuple/
  union signatures narrow, do not pack.
- `packages/plgg-view/README.md` — DOC. Update "The view tree — `Html<Msg>`"
  to document `Html<Msg, T>`, the category vocabulary, the `ul`→`li` rule, void
  `input`, the cardinality forms, the `el` escape hatch, and the producer-side
  vs. TSX framing + the agent-legibility rationale.
- `.workaholic/stories/plgg-view.md` — DOC. Add the design narrative (and
  reconcile the stale older-iteration prose). This is the design+policy
  write-up the request asks to land in the repo.
- `packages/example/src/app.ts`, `packages/plgg-server/src/View/usecase/
  htmlDocument.ts` & `response.ts` — EXTERNAL COMPAT. Must keep compiling with
  no `as`; the end-to-end regression check that the default-T story holds.

## Related History

The current `Html<Msg>` view tree, builders, fold/map, SSR, and diff/patch
renderer are fully established by three archived tickets; none impose any
type-level child or arity constraint, so this feature is novel and additive.

- [20260530001735-replace-plgg-view-with-minimal-elm-architecture.md](.workaholic/tickets/archive/work-20260528-143038/20260530001735-replace-plgg-view-with-minimal-elm-architecture.md) — Defines `Html<Msg>`, `ElementContent<Msg>`, `el`/tag builders, `text`, `foldHtml`, `mapHtml`, `renderToString`. Children are `Html<Msg>` with no per-tag/arity restriction — exactly the surface this ticket constrains (same files).
- [20260531064930-redesign-plgg-view-renderer-as-diff-patch.md](.workaholic/tickets/archive/work-20260531-003055/20260531064930-redesign-plgg-view-renderer-as-diff-patch.md) — Confirms the pure model/builders/SSR are unchanged by the renderer redesign and documents the invariants this ticket must honor: no `as`/`any`/`ts-ignore`, coverage > 90%, sole runtime dep is `plgg` (same package).
- [20260527142355-create-plgg-view-presentation-layer.md](.workaholic/tickets/archive/plgg-view/20260527142355-create-plgg-view-presentation-layer.md) — Origin ticket; establishes the model/ + usecase/ scaffolding, `export *` barrels, coverage thresholds, and the dogfood-plgg-`Box` doctrine the new types must follow (same package).

## Implementation Steps

1. **`Html.ts` — add the brand parameter.** Change `ElementContent<Msg>` to
   `ElementContent<Msg, T extends string = string>` with `tag: T`; change the
   union to `Html<Msg, T extends string = string> = Box<"Element",
   ElementContent<Msg, T>> | Box<"Text", …>`. Keep `children: ReadonlyArray<
   Html<Msg>>` (uniform, T erased). The default `= string` makes `Html<Msg>`
   the permissive supertype, so `Html<Msg, "div">` is assignable to it
   (covariance) and all consumers keep compiling.

2. **`element.ts` — category vocabulary.** Add a small, readable set of content
   categories as tag-literal unions (NOT one bespoke type per tag — that would
   be the policy's forbidden "mass-produced near-duplicate derived types"):
   `Phrasing<Msg>` (`span`/`a`/`strong`/`em`/`label`/`h1`/`h2`/`button`/
   `"#text"`), `Flow<Msg>` (phrasing ∪ `div`/`p`/`ul`/`section`/`header`/
   `main`/`form`/`li`), `ListItem<Msg> = Html<Msg, "li">`. Phrasing ⊂ Flow
   falls out of plain covariance (no lattice machinery).

3. **`element.ts` — cast-free pinned constructor(s).** plgg's curried `box`
   widens the tag literal to `string`, so a return annotation alone is not
   enough. Introduce a shared constructor that pins `T` with an explicit content
   type — `box("Element")<ElementContent<Msg, T>>({ tag, attributes, children })`
   — verified cast-free. Derive a couple of category-keyed factories from it
   (one accepting `Flow`, one accepting `Phrasing`) plus the few specials.

4. **`element.ts` — retype the builders.** Flow containers (`div`, `p`,
   `section`, `header`, `main_`, `form`, `li`) accept `ReadonlyArray<Flow<Msg>>`
   and return their branded type. Phrasing containers (`span`, `strong`, `em`,
   `label`, `a`, `h1`, `h2`, `button`) accept `ReadonlyArray<Phrasing<Msg>>`.
   `ul` accepts `ReadonlyArray<ListItem<Msg>>`. `input` is void — type its
   children as `readonly []` (the zero-cardinality demo; `renderToString.spec`
   uses `input([...], [])`). `text` returns `Html<never, "#text">` (no change
   needed beyond the brand flowing through). Keep `el` permissive: `Html<Msg>`
   (default tag), `ReadonlyArray<Html<Msg>>` children — the escape hatch.

5. **`element.ts` — cardinality vocabulary (selective).** Export reusable
   aliases for the arity forms so custom components can opt in:
   `One<Msg, T>` = `readonly [Html<Msg, T>]` (exactly one),
   `NonEmpty<Msg, T>` = `readonly [Html<Msg, T>, ...ReadonlyArray<Html<Msg, T>>]`
   (≥1). Document the single-value-parameter form for exactly-one and the
   heterogeneous tuple form for fixed/ordered arity. Do NOT force existing
   builders onto tuples — apply cardinality only where a real rule exists.

6. **Exports.** Surface the new category + cardinality aliases through
   `Html/model/index.ts` → `Html/index.ts` → `src/index.ts` so `plgg-server`
   and `example` (and users) can name them.

7. **Verify consumers untouched.** Run `scripts/tsc-plgg.sh` and confirm
   `mapHtml`/`foldHtml`/`renderToString`/`render.ts`/`sandbox`/`application`,
   `plgg-server`, and `packages/example` all still compile with no edits and no
   `as`. If any breaks, the fix is the default-`T` story, never a cast.

8. **Tests (`element.spec.ts`).** Positive: branded builders produce the right
   `Box` shape and `.content.tag`; `ul([], [li([], [])])`, `div` with mixed
   phrasing/flow, `input([], [])` all type-check and render. Negative
   (type-level, NO `@ts-expect-error` — it is banned): prove disallowed
   combinations are rejected via positive boolean assertions, e.g. a one-line
   `IsAssignable<A, B>` conditional asserted with `Expect<…, false>` for
   `div`-in-`ul`, `ul`-in-`span`, generic-`Html<Msg>`-in-`ul`. Keep helper
   types single-stage and readable.

9. **Docs.** Update `packages/plgg-view/README.md` (usage + design + the
   producer-side/TSX framing + agent-legibility rationale) and add the design
   narrative to `.workaholic/stories/plgg-view.md` (reconciling the stale
   section). State the honest limits: transparency (`<a>`) is not modeled, the
   category table is hand-maintained and deliberately partial, `mapHtml`/
   `foldHtml` stay uniform over `Html<Msg>`.

10. **Close the loop.** `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
    green with coverage > 90%, Prettier (printWidth 50) applied.

## Patches

> **Note**: These patches are the verified core of the design (prototyped to
> pass `tsc --strict` cast-free). The builder bodies below are representative;
> apply the same pattern to the remaining tags per Implementation Steps.

### `packages/plgg-view/src/Html/model/Html.ts`

```diff
--- a/packages/plgg-view/src/Html/model/Html.ts
+++ b/packages/plgg-view/src/Html/model/Html.ts
@@
-export type Html<Msg> =
-  | Box<"Element", ElementContent<Msg>>
-  | Box<"Text", Readonly<{ value: SoftStr }>>;
+export type Html<
+  Msg,
+  T extends string = string,
+> =
+  | Box<"Element", ElementContent<Msg, T>>
+  | Box<"Text", Readonly<{ value: SoftStr }>>;
@@
-export type ElementContent<Msg> = Readonly<{
-  tag: SoftStr;
+export type ElementContent<
+  Msg,
+  T extends string = string,
+> = Readonly<{
+  tag: T;
   attributes: ReadonlyArray<Attribute<Msg>>;
   children: ReadonlyArray<Html<Msg>>;
 }>;
```

### `packages/plgg-view/src/Html/model/element.ts`

```diff
--- a/packages/plgg-view/src/Html/model/element.ts
+++ b/packages/plgg-view/src/Html/model/element.ts
@@
-const tag =
-  (name: SoftStr) =>
-  <Msg>(
-    attributes: ReadonlyArray<Attribute<Msg>>,
-    children: ReadonlyArray<Html<Msg>>,
-  ): Html<Msg> =>
-    el(name, attributes, children);
+// Pins the tag literal cast-free (curried `box` would widen it to string).
+const elem =
+  <T extends string>(name: T) =>
+  <Msg>(
+    attributes: ReadonlyArray<Attribute<Msg>>,
+    children: ReadonlyArray<Html<Msg>>,
+  ): Html<Msg, T> =>
+    box("Element")<ElementContent<Msg, T>>({
+      tag: name,
+      attributes,
+      children,
+    });
```

## Considerations

- **Default `T = string` is load-bearing.** Every external consumer uses bare
  `Html<Msg>`; if `T` were required, `plgg-server` and `example` break and the
  only "fix" would be a cast (prohibited). Verify `Html<Msg, "div">` stays
  assignable to `Html<Msg>` after the change (`packages/example/src/app.ts`,
  `packages/plgg-server/src/View/usecase/htmlDocument.ts`).
- **Runtime data must stay uniform.** The diff/patch renderer indexes children
  positionally and homogeneously (`packages/plgg-view/src/Program/usecase/
  render.ts`); `ElementContent.children` must remain `ReadonlyArray<Html<Msg>>`,
  never a branded/tuple type at the data layer. The brand lives only in builder
  signatures.
- **Selectivity is a policy hard limit.** type-driven-design forbids "multi-stage
  conditional types" and "mass-produced near-duplicate derived types." Keep a
  handful of shared category aliases — do not generate one accept-type per tag,
  and do not model the full HTML content-model lattice. Brand the high-value,
  genuinely-simple, frequently-violated rules (`ul`→`li`, void `input`,
  phrasing-only inlines) and leave the rest as Flow. (`element.ts`)
- **Negative tests cannot use `@ts-expect-error`** (banned alongside `as`/
  `any`/`ts-ignore`). Use single-stage `IsAssignable<A, B>` booleans asserted
  positively. Keep these helpers readable (`element.spec.ts`).
- **`mapHtml` rebuild lands on default-T.** `mapHtml` reconstructs via
  `box("Element")`, so its output is `Html<Msg, string>`, not a branded node —
  meaning a mapped child cannot re-enter a strict slot. This is acceptable;
  document it rather than complicate `mapHtml` (`packages/plgg-view/src/Html/
  usecase/mapHtml.ts`).
- **Known unmodeled cases (document, do not chase):** transparency (`<a>` /
  `<ins>` content depends on parent), and elements without builders yet
  (`table`/`tr`/`td`, `select`/`option`, `dl`) — future, additive. State this
  in the README so the partiality is honest, not a silent gap.
- **Coverage.** New builder branches in `element.ts` are not excluded from
  coverage (`vite.config.ts`); every category factory and special-case builder
  needs at least one runtime spec exercising it, on top of the type-level tests.
- **Doc reconciliation.** `.workaholic/stories/plgg-view.md` currently describes
  an older JSX/VNode iteration; align it with the current TEA `Html<Msg>` model
  when adding the content-model section, rather than appending a contradicting
  narrative.
- **Formal policy promotion (optional follow-up).** The request mentions
  documenting the *policy*. The agent-legibility rationale is captured in the
  README + story here; promoting it to a formal bilingual `.workaholic/
  policies/*.md` entry (the manager-owned, EN/JA convention) is a separate,
  manager-blessed step and is intentionally out of this ticket's scope.

## Final Report

Development completed as planned. Implemented `Html<Msg, T>` with a default
`string` brand, four cast-free pinned factories
(`flowEl`/`phrasingEl`/`listEl`/`voidEl`), the `Phrasing`/`Flow`/`ListItem`
categories and `One`/`NonEmpty` cardinality aliases, retyped builders, and a
permissive `el` escape hatch. Added runtime + type-level tests (negatives proven
as positive boolean assertions, verified non-vacuous). Updated the README and
the plgg-view story. Verified: plgg-view 53 tests, coverage 98.9% stmts / 94.7%
branch / 98.5% funcs / 98.9% lines; example 8 tests + clean tsc; plgg-server 73
tests + clean tsc; plgg core clean.

### Discovered Insights

- **Insight**: Honest tag-branding makes the `el` escape hatch unable to nest
  inside a typed parent. Because the brand equals the real (dynamic) tag and the
  no-cast rule forbids faking a category, an `el(...)` node is `Html<Msg,
  string>` and is rejected by any typed child slot. The resulting model is
  "typed islands vs. escape-hatch islands": a raw `el` child cannot interleave
  into a typed parent — build the whole untyped subtree (parent included) with
  `el`.
  **Context**: This is the central design trade-off of the feature and the
  reason `packages/plgg-server`'s SSR spec had to wrap its outer element in `el`.
  Anyone extending the typed builder set (tables, `select`, etc.) is really
  deciding how large the "typed islands" can grow before authors fall back to
  `el`. A future wildcard-brand would only work by abandoning honest branding.

- **Insight**: Downstream packages consume plgg-view's **built `dist/.d.ts`**
  (symlinked via `file:../plgg-view`), not its `src`. A type-signature change to
  plgg-view is invisible to `packages/example` / `plgg-server` until
  `npm run build` regenerates the declarations.
  **Context**: `scripts/tsc-plgg.sh` only checks `packages/plgg`; verifying a
  plgg-view change end-to-end means rebuilding plgg-view, then running `tsc` in
  each consumer package. Easy to miss and produces confusing "Generic type
  'Html' requires 1 type argument(s)" errors against the stale `.d.ts`.

- **Insight**: With `@ts-expect-error` banned alongside `as`/`any`, negative
  type tests are written as **positive boolean assertions** — a one-line
  `IsAssignable<A, B>` (single-stage conditional) wrapped in `Not<…>` and fed to
  `accept<_Ok extends true>()`. A broken constraint flips the boolean and fails
  the build; confirmed non-vacuous by a control that correctly errors.
  **Context**: This is the reusable pattern for type-level testing anywhere in
  the repo under the no-escape-hatch rule.
