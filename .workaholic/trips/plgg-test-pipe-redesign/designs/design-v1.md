# Design v1

Author: Constructor
Status: draft
Reviewed-by: none

## Content

### 0. Grounding (verified against this worktree)

- **Prior art is present and proven.** `packages/plgg-test/` carries
  the first attempt: a fluent `expect(x).toBe(y)` boundary that THROWS,
  plus a full runner/discovery/reporter/resolver/watch/coverage stack
  that the prior trip drove to test-for-test parity with vitest (74
  files / 465 / 0) and four-metric coverage. The redesign replaces the
  **authoring/assertion layer only**; the plumbing is style-agnostic.
- **plgg's composition primitives** I will build on (read in
  `packages/plgg/src`):
  - `pipe(value, ...unary fns)` — value-first, each step `(x) => y`.
  - `cast(seed, ...steps)` where each step is
    `(x) => Result<y, ERR>`; **short-circuits on the first `Err`**.
    This is exactly an assertion chain over one value.
  - `proc(seed, ...steps)` — the async/`Result` form (error channel
    fixed to `Error`), for async assertions.
  - `refine(predicate, msg): (a) => Result<a, InvalidError>` — the
    canonical "predicate → Result" shape. **Every matcher is a
    `refine`-shaped function.**
  - `tryCatch(fn, handler): (arg) => Result<U, E>` — turns throwing
    code into a `Result`; the native way to assert on throwing code.
  - `matchResult(onErr, onOk)`, `mapErr`, `match` — folds.
- **The runner's current contract** is throw-based: `TestFn = () =>
  void | Promise<void>`, and a thrown `AssertionError` (or rejected
  promise) is what marks a test failed (`Core/Runner.ts` `guard` +
  `guardWithRejectionWindow`). The redesign changes this contract (see
  §3).

### 1. The redesign decision — assertions RETURN `Result`, the test body RETURNS it, the runner COLLECTS it

**Decision: matchers are data-last functions returning
`Result<Actual, AssertionError>`; a test body RETURNS its assertion
`Result` (or a combined one); the runner's contract becomes "a test is
a function returning `Result`/`Promise<Result>`, and the returned
value IS the verdict." Matchers do NOT throw.**

This is the house rule (Result-not-throw) applied honestly, and it
directly neutralises the redesign's existential risk (a dropped
`Result` = false green) by construction: **the test body's return
value is the verdict, so the assertion's `Result` is never "dropped" —
the only way to write a test is to return the thing the runner reads.**

#### 1.1 Resolving the "but how does `assert`-narrowing work then?"

A `Result`-returning function cannot be `asserts cond` — narrowing
needs a throw. The redesign SPLITS the two concerns the old `assert`
conflated:

- **Value assertions** (the 99% case — `shouldBe`, `shouldEqual`, …)
  return `Result`. They never narrow types; they compare values.
- **Type narrowing** (`assert(isOk(x)); x.content`) is a SEPARATE,
  explicitly-throwing primitive named `narrow` (an `asserts cond`
  function). It is documented as the one throwing seam, used only to
  refine a type before the value assertions run — and crucially it
  composes INTO the pipeline: `narrowResult`/`narrowOption` return the
  unwrapped inner value as a `Result`, so the common
  `assert(isOk(r)); r.content` becomes
  `pipe(r, shouldBeOk, ...)` where `shouldBeOk: (r: Result<T,E>) =>
  Result<T, AssertionError>` both ASSERTS ok AND yields the inner `T`
  for the next step. Narrowing-by-throw is the rare escape hatch, not
  the assertion model.

### 2. The authoring + assertion surface (concrete code)

#### 2.1 A matcher is a `refine`-shaped function

```ts
// Core matcher type: data-last, Result-returning.
export type Matcher<A> = (
  actual: A,
) => Result<A, AssertionError>;

// `shouldBe` — Object.is equality. Mirrors `refine`.
export const shouldBe =
  <A>(expected: A): Matcher<A> =>
  (actual) =>
    Object.is(actual, expected)
      ? ok(actual)
      : err(
          assertionError({
            message: `expected ${fmt(actual)} to be ${fmt(expected)}`,
            expected: fmt(expected),
            actual: fmt(actual),
          }),
        );

// `shouldEqual` — deep structural equality (reuses the prior-art
// deep-equal, which already handles plgg Box/Datum/Dict shapes).
export const shouldEqual =
  <A>(expected: A): Matcher<A> => …;
```

`actual` flows THROUGH on success (`ok(actual)`), so matchers chain in
a `cast`/`pipe` and the value is available downstream.

#### 2.2 Writing an assertion — `pipe` / `cast`

```ts
// One assertion: the test body returns the Result.
test("addition", () =>
  pipe(2 + 2, shouldBe(4)));

// Several assertions on one value: `cast` short-circuits on first Err.
test("string ops", () =>
  cast(
    greet("ada"),
    shouldBe("hi ada"),       // Result<string,…>
    shouldContain("ada"),     // runs only if the prior was ok
  ));

// Several INDEPENDENT assertions: `all([...])` aggregates so EVERY
// failure is reported, not just the first.
test("user shape", () =>
  all([
    pipe(u.id, shouldBe(1)),
    pipe(u.name, shouldEqual("Ada")),
  ]));
```

#### 2.3 Negation, deep-equality, membership, comparison — all functions

```ts
shouldNotBe(x)            // Matcher
not(shouldContain(x))     // a combinator: flips any Matcher
shouldContain(x)          // string substring | array membership
shouldHaveLength(n)
shouldBeGreaterThan(n)
shouldBeInstanceOf(Ctor)
shouldBeNone / shouldBeSome / shouldBeOk / shouldBeErr  // Option/Result
```

`not` is a higher-order matcher combinator — the pipe-native analogue
of `.not`:

```ts
export const not =
  <A>(m: Matcher<A>): Matcher<A> =>
  (actual) =>
    matchResult(
      () => ok(actual),            // inner failed → negation passes
      () => err(assertionError({ … })),
    )(m(actual));
```

#### 2.4 Result/Option assertions that ALSO unwrap (the narrowing replacement)

```ts
// Asserts Ok AND yields the inner value for the next pipe step —
// replaces `assert(isOk(r)); r.content`.
export const shouldBeOk =
  <T, E>(): ((
    r: Result<T, E>,
  ) => Result<T, AssertionError>) =>
  (r) =>
    isOk(r)
      ? ok(r.content)
      : err(assertionError({ message: `expected Ok, got Err: ${fmt(r)}` }));

// Usage: assert ok, then assert the inner value — one pipeline.
test("parse ok", () =>
  pipe(
    asInt("42"),
    shouldBeOk(),        // Result<Int, AssertionError>
    shouldBe(int(42)),
  ));
```

`shouldBeErr` symmetrically yields the error for further assertion
(`shouldBeErr(), atProp("message"), shouldBe("…")`).

#### 2.5 Async — `proc`

```ts
test("fetch user", () =>
  proc(
    findUser(1),                 // Promise<Result<User, Error>>
    shouldBeOk(),
    (u: User) => shouldEqual(expected)(u),
  ));
```

`proc` already returns `Promise<Result<…>>`; the runner awaits the
body, so async tests are just `proc` pipelines.

#### 2.6 Throwing code — `tryCatch`

```ts
// Assert that a thunk throws, and that the thrown thing matches.
test("guards bad input", () =>
  pipe(
    tryCatch(() => parseOrThrow("bad"))(undefined),
    shouldBeErr(),                       // it threw → Err
    (e: Defect) => shouldContain("bad")(messageOf(e)),
  ));
```

No special `toThrow` matcher engine: throwing code is lifted to a
`Result` with the existing `tryCatch`, then asserted like any `Result`.

#### 2.7 `test` / `suite` / hooks — bodies return `Result`

```ts
export type Assertion =
  | Result<unknown, AssertionError>
  | Promise<Result<unknown, AssertionError>>;

export type TestBody = () => Assertion;

export const test: (name: string, body: TestBody) => void;
export const suite: (name: string, fn: () => void) => void; // was describe
export const beforeEach / afterEach: (fn: () => Assertion | void) => void;
```

The runner runs the body, reads the returned `Result`, and records
`Err` as a failure (`matchResult` fold) — see §3.

### 3. What to REUSE vs. rebuild

**Reuse essentially unchanged (style-agnostic plumbing):**
- `Discovery/find.ts` (fs walk), `Reporter` (fold → text + exit code),
  `Resolve/hook.ts` (`module.register` + `ts.transpileModule`),
  `Coverage/*` (four-metric `NODE_V8_COVERAGE`), the bin launcher
  (fresh-process watch + coverage re-exec), `Cli/args.ts`,
  `plgg-test.config.json` per-package thresholds.
- `Core/Registry.ts` (the `root`/`cursor` tree) — `test`/`suite`/hooks
  still register a tree; only the stored body's TYPE changes
  (`() => Assertion` instead of `() => void|Promise<void>`).
- `Expect/equals.ts` (deep-equal) and `Expect/format.ts` (value
  printer) — reused verbatim by the new matchers.

**Rebuild (the redesign):**
- A new `Assert/` (or `Matchers/`) module: the `Matcher` type, the
  closed matcher set, `not`, `all`, the Option/Result unwrap-asserts,
  and `assertionError`.
- The **Runner contract change** (`Core/Runner.ts`): a test body now
  RETURNS `Assertion`. The runner folds it:
  ```ts
  const settle = (body): Promise<StepResult> =>
    matchResult(
      (e: AssertionError) => failed(e),
      () => passed(),
    )(await Promise.resolve(body()));
  ```
  The prior throw-capture (`guard`) is KEPT as a SAFETY NET — a body
  that still throws (or rejects) is recorded as failed, so an
  exception is never swallowed. **Both channels fail the test**: a
  returned `Err` OR a throw. This is the belt-and-suspenders against
  the dropped-Result false green (§4).
- `Mock/vi.ts`: keep `fn`/`spyOn`/stub helpers (the corpus uses spies);
  drop the vitest-flavoured naming if desired, but spies are
  style-neutral — minimal change.

**Delete:** the fluent `Expect/expect.ts` boundary and the ambient
`types/index.d.ts` assert-narrowing shim (no longer needed — `narrow`
is a normal throwing function used rarely; value matchers return
`Result`).

### 4. Quality strategy — proving no false green

The redesign's existential risk is a `Result` that never reaches the
runner. Defences, in order:

1. **The body returns the verdict.** The single idiomatic form —
   `test(name, () => pipe(...))` — makes the assertion's `Result` the
   return value. There is no "call and ignore": the runner reads what
   the body returns.
2. **Belt-and-suspenders runner.** If a body is mis-written to NOT
   return its `Result` (e.g. returns `undefined`/`ok()` while a real
   assertion `Result` was computed and dropped), that is a latent
   false green. Mitigation: the runner treats a body whose return is
   **not** a `Result` as a FAILURE ("test body did not return an
   assertion") unless it is the explicit `ok()`/`pass()` sentinel — so
   forgetting to return loudly fails. (`pass()` exists for the rare
   genuinely-assertion-free test.)
3. **Meta-harness (plain `throw`, no plgg-test).** Proves the
   primitives before self-tests are trusted: a failing matcher returns
   `Err`; the runner records a returned `Err` as failed and sets exit
   code 1; a body that drops its `Result` (returns `undefined`) is
   failed; `shouldEqual` deep-equals real plgg `Box` shapes; a thrown
   exception in a body still fails. Explicitly construct the
   mishandling cases (direction §5) and show they fail.
4. **Verdict-parity oracle.** Rewrite plgg's specs to the new idiom
   and require the SAME per-test pass/fail verdicts as the OLD
   plgg-test produced on the same corpus (74 files / 465 / 0). Parity
   is "change the expression, preserve the verdict," checked against
   that baseline — same file SET + same verdicts.
5. **Four-metric coverage** unchanged (reused), gating plgg at 91.

### 5. Migration

Vitest drop-in is explicitly NOT a goal. Specs are rewritten to the
pipe idiom. plgg's specs currently import the OLD plgg-test
(`from "plgg-test"`, fluent) and must be rewritten — this is a
hand/codemod rewrite of expression, not an import swap.

- **Codemod (best-effort, not API-shaping):** a script can mechanically
  convert the common shapes —
  `expect(a).toBe(b)` → `pipe(a, shouldBe(b))`,
  `expect(a).toEqual(b)` → `pipe(a, shouldEqual(b))`,
  `assert(isOk(r))` + later `r.content` → `shouldBeOk()` pipeline — and
  FLAG anything it can't safely transform for hand-rewrite. Because the
  fluent corpus is a closed, known set, the long tail is small and
  enumerable. The codemod is a convenience; correctness is gated by the
  verdict-parity oracle, not by the codemod.
- A test with multiple independent `expect`s becomes `all([...])`.
- The API vocabulary is scoped to what the real suite uses (a closed
  set) — no speculative DSL (direction §5 scope guardrail).

### 6. Delivery plan & risks

Order: new `Matcher` type + the closed matcher set (reusing
equals/format) → `not`/`all`/Option-Result unwrap-asserts → Runner
contract change + belt-and-suspenders → meta-harness (mishandling
cases) → rewrite a representative SLICE of plgg specs, judge ergonomics
(direction §5), fix vocabulary → full rewrite → verdict-parity gate →
watch/coverage re-verify.

Risks:
- **Dropped-Result false green (headline).** Mitigated by §4.1–§4.3
  (return-is-verdict + non-Result-return-is-failure + meta-harness
  mishandling proofs).
- **Ergonomics regression.** A common check reading clumsily. Mitigated
  by the early representative-slice rewrite and a "reads better than
  fluent AND no false green" success bar (direction §6).
- **Verdict drift during rewrite.** Mitigated by the parity oracle.
- **`all` async aggregation.** Aggregating `Promise<Result>`s must
  await all and combine errors; standard but must not short-circuit
  (unlike `cast`). Covered by self-tests.
- **Scope creep into a DSL.** Hard guardrail: closed matcher set, reuse
  plumbing, follow-ups named not built.

### 7. Policies

- **`workaholic:implementation` / `implementation/directory-structure`**
  — the rebuilt authoring layer lives in the established
  `packages/plgg-test/src/<Domain>/` layout (new `Matchers/`/`Assert/`;
  reused `Core/`, `Coverage/`, `Resolve/`, `Discovery/`).
- **`workaholic:implementation` / `implementation/coding-standards`**
  — the whole point: the API must BE house style — data-last
  `Matcher` functions, `Result` not throw, `pipe`/`cast`/`proc`
  composition, exhaustive `match`/`matchResult`, no
  `as`/`any`/`ts-ignore`, Prettier 50. The [[plgg-coding-style]] skill
  is the lens.
- **`workaholic:implementation` / `implementation/testing`** — it is a
  test framework: the no-false-green guarantee (now centred on the
  dropped-Result case), the meta-harness, and the verdict-parity oracle
  live here, as does the >90% coverage rule
  ([[feedback_coverage_threshold]]).
- **`workaholic:operation` / `operation/command-scripts`** — the
  `scripts/*-plgg-test.sh` runner family stays as thin `npm run …`
  wrappers ([[feedback_command_scripts_policy]]); only the npm script
  bodies/the package's API change.
- **`workaholic:operation` / `operation/ci`** — the runner remains the
  CI green/red gate; the exit-code contract (0 only on all-pass; the
  returned-`Err` and thrown channels both fail) is the agent/CI
  contract.
- **`workaholic:operation` / `operation/dependencies`** — boundary
  unchanged: runtime dep `plgg` only; `typescript` (existing devDep)
  for the transpile load hook; no new third-party deps; vitest already
  dropped as the runner.

(Confirm exact policy slugs against the implementation/operation skill
indexes during the build.)

## Review Notes

(none yet)
