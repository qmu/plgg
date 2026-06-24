# Architect Coding-Review Checklist (pipe-style plgg-test)

Author: Architect (QA — analytical review only; no test execution)
Status: prep note for the Coding-Phase review
Scope: read-only. Criteria I will judge Constructor's implementation by,
grounded in the 9 plan guardrails and re-verified plgg source. Cites
real primitive shapes so the review isn't hand-wavy.

## Re-verified plgg primitives (the grammar the new layer must speak)

Read in `packages/plgg/src`:
- **`Contextuals/Box.ts`** — `Box<TAG,CONTENT> = Readonly<{__tag:TAG;
  content:CONTENT}>`. `isBox(v)` = object + `__tag:string` + has
  `content`. `box(tag)(content)` constructs. **Crucial:** `Ok`/`Err`
  ARE boxes (`Ok<T> = Box<"Ok",T> & {...}`, see `Contextuals/Ok.ts`
  line 29 + `ok` spreads `box(okTag)(a)`). So **`isBox(anyResult)` is
  already true** — `isBox` alone CANNOT separate an Assertion from a
  domain `Result`. The brand must be a distinct tag/marker (guardrail 1).
- **`Disjunctives/Result.ts`** — `Result<T,F>=Ok<T>|Err<F>`;
  `matchResult(onErr,onOk)` data-last fold; `mapErr` data-last.
- **`Functionals/refine.ts`** — `refine(pred,msg?) => (a) =>
  Result<a,InvalidError>`. The canonical matcher shape.
- **`Flowables/cast.ts`** — `cast(seed,...steps)`, each `(x)=>
  Result<y,ERR>`; **short-circuits on first Err** AND accumulates
  `sibling` errors into one `InvalidError` ("Cast failed at N of M").
- **`Flowables/proc.ts`** — `proc(seed,...steps)` async; yields
  `Promise<Result<T, E|Defect>>` where E is the union of step errors
  (NOT "fixed to Error"); catches a thrown plgg error as itself,
  any other throw as `Defect("Unhandled throw in proc")`.
- **`Functionals/tryCatch.ts`** — `tryCatch(fn)(arg)` lifts a throw to
  `Result<U,Defect>` (curried; custom handler → `Result<U,E>`).
- **`Disjunctives/Option.ts`** — `matchOption(onNone,onSome)`,
  `getOr`, `okOr(error)`.
- **Prior art reused:** `Expect/equals.ts` (deep-equal, Box/Datum/Dict
  aware), `Expect/format.ts` (value printer), `Core/Registry.ts`,
  `Core/Reporter.ts`, `Discovery/find.ts`, `Resolve/hook.ts`,
  `Coverage/*`, bin launcher, `Cli/args.ts`.

## Checklist by guardrail

### 1. Branded-Assertion keystone (HIGHEST scrutiny)

The single most important structural check. A plain `Result` is NOT a
sufficient `Assertion` because `test(() => asInt("x"))` returns a real
domain `Result` the runner would mis-read as a verdict.

Verify in the impl:
- [ ] `Assertion` is a `Box`-BRANDED value with its OWN distinct tag
  (e.g. `__tag: "Assertion"` or a wrapper box carrying the inner
  `Result<Pass,Fail>`), NOT a bare `Ok`/`Err`. Confirm the tag is
  unique vs `"Ok"`/`"Err"`/any domain box.
- [ ] The runner's "is this an Assertion?" guard is a real type guard
  (`isBox(v) && v.__tag === "<assertionTag>"`, or a dedicated
  `isAssertion` predicate) — and returns `value is Assertion`. It must
  NOT be `isBox(v)` alone (would accept any Result — see source note
  above) and must NOT be an `as` cast.
- [ ] The brand still COMPOSES: an `Assertion` must thread through
  `pipe`/`cast`/`proc`/`matchResult` unchanged — i.e. the brand is a
  plgg `Box`, not a foreign class. Check that `cast(actual, matcherA,
  matcherB)` type-checks and the matchers return the branded type.
- [ ] **No `as` cast** anywhere the brand is applied or read. The brand
  is constructed via `box(tag)(...)`/`ok`/`err`, read via the guard.
- [ ] Runner guard behavior (anti-false-green): a body resolving to a
  bare domain `Result`, `void`/`undefined`, or any non-Assertion FAILS
  the test as "body did not return an assertion." Confirm this is in
  the fold, not just documented.

### 2. Narrowing = value-carrying matchers ONLY

- [ ] `shouldBeOk`/`shouldBeErr`/`shouldBeSome`/`shouldBeNone` (and
  `okContent`-style) return the UNWRAPPED inner value inside the
  passing branch, so `cast(x, okContent(), shouldBe(...))` carries the
  inner value forward (data-flow narrowing).
- [ ] The throwing `narrow` / `asserts cond` primitive is **GONE**.
  Grep for `asserts ` in the new layer — must be absent.
- [ ] The ambient `types/index.d.ts` assert-narrowing shim from the
  first trip is **deleted** (it was the TS6 fragility class). Confirm
  the file is removed or no longer carries an `asserts` declaration.

### 3. `all` aggregates, never short-circuits (drop-shape (d) risk)

The semantic INVERSION of `cast` — the subtlest false-green vector.
- [ ] `all(ReadonlyArray<Assertion>)` runs EVERY element and folds
  EVERY `Err` — it must NOT stop at the first failure (that would hide
  later real failures = false green).
- [ ] Sibling accumulation reuses plgg's existing `InvalidError`/`Box`
  sibling mechanism (as `cast` does), NOT a bespoke aggregate DSL
  (scope guardrail).
- [ ] The async form (`all` over `Promise<Assertion>`s) AWAITS all,
  then folds — does not short-circuit and does not lose a rejected/
  Err arm.
- [ ] `check(actual, ...matchers) === all(ms.map(m => m(actual)))` —
  the terse single-call entry; confirm it's `all`-backed (so the
  common case still aggregates) and keeps the trivial check to one call.

### 4. Heterogeneous `Fail` / `Assertion` typing without `as`/`any`

- [ ] `Fail` fields are pre-formatted to STRINGS at the matcher
  boundary (reuse `format.ts`): `Fail = {matcher; expected; actual;
  message: string}`. This is what lets `all([Assertion<number>,
  Assertion<string>])` type-check with no `as`/`any`.
- [ ] `Pass<T>` keeps the precise value type on the single-matcher
  (`pipe`/`cast`) path so `okContent()` → `shouldBe(x)` stays typed.
- [ ] Confirm no `as`/`any` was needed to make the heterogeneous
  `ReadonlyArray<Assertion>` in `all`/`check` compile.

### 5. Runner fold-seam — defect-path vs assertion-path

- [ ] The fold uses `matchResult` (or equivalent exhaustive fold) on
  the body's returned branded Assertion: inner `Err`(Fail) → failed;
  inner `Ok`(Pass) → passed.
- [ ] The prior throw-capture (`guard`/`guardWithRejectionWindow`) is
  KEPT as the defect safety net — a body that THROWS or rejects is
  still recorded failed. Both channels fail; neither replaces the other.
- [ ] Async fold maps BOTH `AssertionError` AND `Defect` error arms to
  failed (a `proc` body's caught throw surfaces as `Defect`). Verify
  the fold doesn't only handle `AssertionError` and silently pass a
  `Defect`.
- [ ] The O2 unhandled-rejection window (prior art) is preserved for
  fire-and-forget rejections.

### 6. Anti-false-green proven against the CLOSED drop-shape set

Meta-harness (plain `throw`, no plgg-test) must each PROVE-FAILS:
- [ ] (a) body returns void/undefined while an assertion was computed.
- [ ] (b) body returns a DIFFERENT (passing) Assertion than the one
  computed — note: the body-return contract catches the dropped-sync
  case; confirm the meta-harness still demonstrates it.
- [ ] (c) async `Promise<Assertion>` not awaited.
- [ ] (d) `proc`/`all` short-circuits or swallows an inner `Err`.
- [ ] (e) body returns a non-Result truthy value.
- [ ] Plus: a failing matcher returns branded `Err`; the runner
  records it failed and sets exit code 1; `shouldEqual` deep-equals
  real plgg Box shapes; a thrown body still fails.

### 7. Single-returned-expression idiom; combinators the only multi-path

- [ ] `check`/`all`/`cast`/`pipe` are the documented multi-assert paths;
  no statement-sequence bodies that compute-then-drop assertions.
- [ ] If a `pass()` sentinel exists, it is conspicuous (requires a
  reason/label) and rare — not an easy silent no-op.

### 8. Verdict-parity + mutation spot-check

- [ ] Verdict parity vs the OLD plgg-test on plgg's corpus
  (74 files / 465 / 0): same file SET + same per-test verdicts.
- [ ] Mutation spot-check: on a representative slice, flipping expected
  values makes those tests FAIL (proves assertion FORCE, not just
  green color). Confirm this check exists, not just parity.

### 9. Ergonomic slice judged early

- [ ] A fixed idiom-spanning slice (high-`toBe`-density spec + async/
  `proc` spec + Result-narrowing spec) was rewritten BEFORE the full
  rewrite, and reads as plgg-idiomatic (no fluent chains remain).

## Boundary integrity (cross-cutting)

- [ ] Reused plumbing genuinely UNCHANGED: `Discovery/find.ts`,
  `Reporter`, `Resolve/hook.ts` (module.register + ts.transpileModule),
  `Coverage/*` (four-metric, per-package thresholds incl. plgg=91,
  plgg-http=90, ungated packages), bin launcher (fresh-process watch +
  coverage re-exec), `Cli/args.ts`, `equals.ts`, `format.ts`, Registry
  TREE mechanics. The ONLY substantive change is the Runner fold-seam
  + the stored body TYPE (`()=>Assertion`). Flag any drift into the
  plumbing.
- [ ] Dependency boundary: runtime dep = `plgg` ONLY; `typescript` is
  the existing devDep for the load hook. No new third-party dep. Check
  `package.json`.

## Reject on sight

- Any `as` / `any` / `ts-ignore` / `@ts-expect-error` in the new layer
  (THE MOST IMPORTANT RULE), especially around the brand application,
  the runner guard, and the heterogeneous `all` array.
- A runner Assertion-guard that is `isBox(v)` alone (accepts any
  Result — keystone failure).
- An `all` that short-circuits like `cast` (hides real failures).
- A surviving throwing `narrow` / `asserts cond` or ambient
  assert-narrowing `.d.ts`.
- An async fold that handles only `AssertionError` and lets `Defect`
  pass.
- A coverage gate regression (hardcoded threshold; line-only) — the
  four-metric per-package gate from the first trip must be reused as-is.
- Prettier hand-packing onto fewer lines (printWidth 50 per package).
