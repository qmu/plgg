# Model v1

Author: Architect
Status: draft
Reviewed-by: none

## Content

### 0. Grounding — what I read

plgg's combinators (this worktree, `packages/plgg/src`):
- `Flowables/pipe.ts` — `pipe(seed, ...fns)`: a data-FIRST seed
  threaded through data-LAST unary fns (`reduce((acc,fn)=>fn(acc))`).
  No Result awareness — pure value threading.
- `Flowables/cast.ts` — `cast(seed, ...fns)` where each fn is
  `(a) => Result<B, ERR>`: a SYNC Result chain. On a step's `Err` it
  keeps going but ACCUMULATES `sibling` errors into one `InvalidError`
  ("Cast failed at N of M steps"). This is plgg's validation idiom.
- `Flowables/proc.ts` — `proc(seed, ...fns)` where each fn returns
  `Procedural<T,E>` (`PossiblyPromise<PossiblyResult>`): ASYNC chain
  that short-circuits on the first `Err`, awaits Promises, and catches
  any THROW into a `Defect` (`err(defect("Unhandled throw in proc"))`).
  Returns `Promise<Result<T, E|Defect>>`. Domain code "returns
  `err(...)`, never throws" (proc.ts comment).
- `Flowables/match.ts` — `match(value)(...cases)`: CURRIED, exhaustive;
  a non-exhaustive case set makes the call type `CoverageError<A>` (a
  compile error at the use site), runtime returns `coverageError(a)`.
- `Disjunctives/Result.ts` — `Result<T,F> = Ok<T> | Err<F>`;
  `matchResult(onErr, onOk)` and `mapErr` are data-last folds.
- `Disjunctives/Option.ts` — `Option<T> = Some<T> | None`;
  `matchOption(onNone, onSome)`, `getOr`, `okOr(error)` data-last.
- Constructors: `ok`/`err` (`Contextuals/Ok.ts`,`Err.ts`),
  `some`/`none`.

Prior-art plgg-test (`packages/plgg-test/src`), the plumbing to reuse:
- `Core/Runner.ts` — imports a spec (registration side effect), walks
  the suite tree, runs each test via `guard` = **try/catch** turning a
  THROW or rejected promise into a `StepResult{failed,message,stack}`;
  plus the O2 unhandled-rejection window. **This is the seam the
  redesign changes** (catch-throw → collect-Result).
- `Core/Registry.ts`, `Core/Reporter.ts`, `Core/types.ts`,
  `Discovery/find.ts`, `Coverage/{v8,gate,config,sourcemap}.ts`,
  `Resolve/hook.ts` (`module.register`+`ts.transpileModule`),
  `Cli/{cli,args}.ts`, watch (now in the bin launcher) — all
  **style-agnostic plumbing**, reusable mostly unchanged.
- `Expect/{expect,matchers,equals,asymmetric,format}.ts`,
  `Assert/assert.ts`, `Mock/vi.ts` — the **fluent surface being
  REPLACED** (`expect(x).toBe(y)` chain that throws `AssertionError`).

### 1. System coherence — vision → structural components

Business vision (direction v1): the spec corpus is the most-read
teaching surface; a fluent OOP chain corrodes an Option/Result
data-last codebase; assertions become composable data-last functions
returning `Result`, piped — idiom prioritized OVER vitest drop-in.
Existential risk: a returned failure `Result` silently dropped =
false green. Map:

| Vision element | Structural component |
| --- | --- |
| Assertions read as a pipeline | **Assertion combinator**: a matcher is a data-last `(expected) => (actual) => Assertion` composed under `pipe`/`cast` |
| Returns Result, not throws | **Assertion = `Result<Pass, Fail>`** (a branded plgg `Result`), produced by matchers, never thrown |
| `test`/`suite` declaration | **Authoring façade**: `test(name, body)` / `describe` — body RETURNS the assertion aggregate the runner collects |
| No false green | **Body-return contract + runner fold**: the runner's verdict is derived from the RETURNED Result(s), and a body that returns a non-Result/void is itself a failure (closes the silent-drop hole) |
| Negation / async / deep-eq compose as functions | **Combinators** (`not`, `all`, async via `proc`) not chain segments |
| Reuse proven plumbing | **Boundary reuse**: Runner (refactored seam), Registry, Reporter, Discovery, Coverage, Resolver, Watch unchanged |
| House style mandatory | Components authored in `pipe`/`cast`/`proc`/`match`, Option/Result, no `as`/`any` |

Coherence holds: every vision element lands on one component, and the
single new structural obligation (a body must surface its assertions
as a value the runner reads) is exactly what removes the existential
risk the direction names.

### 2. Domain model of a pipe-style test framework

The ubiquitous vocabulary, expressed in plgg's grammar:

- **Assertion** — the atomic outcome. `Assertion = Result<Pass, Fail>`
  where `Pass` carries the (optionally narrowed) actual value and
  `Fail` carries `{matcher, expected, actual, message}`. Using plgg's
  own `Result` (not a bespoke type) is the keystone: it makes
  assertions first-class citizens of `pipe`/`cast`/`proc`/`matchResult`
  with zero new vocabulary.
- **Matcher** — a data-last assertion *producer*:
  `type Matcher<A> = (actual: A) => Assertion`, and the user-facing
  form is curried on the expectation:
  `toBe = (expected) => (actual) => Assertion`. So a check reads
  `pipe(actual, toBe(expected))` — data-first seed, data-last matcher,
  identical shape to every other plgg pipeline. (Equality reuses the
  prior-art `equals.ts` deep-equal, refactored to return `Assertion`.)
- **Combinator** — assertion-to-assertion or matcher-to-matcher
  functions that replace `.not`/`.resolves`/`.and`:
  - `not : Matcher<A> => Matcher<A>` (inverts Pass/Fail).
  - `all : (...Assertion[]) => Assertion` (cast-style: folds many
    assertions into one, collecting every Fail — mirrors `cast`'s
    sibling-error accumulation, so a test reports ALL failed checks,
    not just the first).
  - async: an assertion over a Promise actual is just a `proc` step —
    `proc(fetchThing(), toEqual(expected))` — no `.resolves` segment,
    because `proc` already awaits and threads Result.
- **Check / `expect` replacement** — there is no stateful `expect(x)`
  object. The entry is `pipe(actual, matcher)` (or, for multiple,
  `check(actual, ...matchers)` sugar returning `all(...)`). "expect"
  as a noun disappears; assertion becomes a verb-phrase pipeline.
- **Test (`it`/`test`)** — `test(name, body)` where
  `body : () => Assertion | Promise<Assertion>` (the data-last
  `proc`-friendly shape). The body's RETURN VALUE is the verdict; the
  runner does not infer pass from "didn't throw".
- **Suite (`describe`)** — unchanged grouping node (Registry plumbing).
- **Hook** — `beforeEach`/`afterEach` unchanged (Registry).
- **Runner** — refactored: collects each body's returned `Assertion`
  (folding `Promise`/`proc` results), maps `Ok→passed`,
  `Err→failed(message from Fail)`, and treats a body that returns
  void/non-Result OR throws as `failed` (the anti-false-green guard).
- **Reporter / Discovery / Coverage / Resolver / Watch** — reused.

Aggregates: Suite contains Suite/Test/Hook (Registry). Matcher
produces Assertion. Combinator transforms Assertion/Matcher. Body
returns Assertion. Runner folds Assertion → TestResult → Verdict.

### 3. Translation-fidelity analysis — does "pipe-style assertions" map cleanly onto plgg's grammar?

Strongly yes — this is the redesign's best property, because the test
API stops *imitating* plgg and starts *being* plgg:

1. **`pipe(actual, toBe(expected))` is literally a plgg pipeline.**
   `toBe(expected)` is a data-last unary fn; `actual` is the seed.
   Same shape as `pipe(x, map(f))`. Zero idiom mismatch — the highest
   possible fidelity.
2. **`cast`/`all` for multi-assertion** matches plgg's validation
   idiom: a test that checks several properties folds them with `all`
   exactly as production code folds validators with `cast`, and gets
   the same "report every failure with siblings" behavior. Faithful.
3. **`proc` for async assertions** is a clean fit: `proc(asyncActual,
   toEqual(expected))` reuses plgg's async-Result threading and its
   throw→Defect capture. An async test body that is itself a `proc`
   chain returns `Promise<Result<...>>` — exactly the body shape.
4. **`matchResult`/`match` for custom assertions**: a user can assert
   on a `Result`/`Option`/variant directly with `match(value)(cases)`
   returning an `Assertion`, instead of `expect(isOk(x)).toBe(true)`.

The two genuine fidelity tensions (carry to design, not solved here):
- **`assert`-style type NARROWING is the hard one.** Today
  `assert(isOk(x)); x.content` narrows via `asserts cond` — which
  REQUIRES a throw (a function that returns a `Result` cannot narrow
  `x`). A pure return-Result world loses narrowing. Options for the
  design: (a) keep a narrowing primitive that DOES throw, declared as
  the single sanctioned throw boundary (a `narrow`/`assert` escape
  used only where the body then needs the narrowed value); (b) provide
  matchers that RETURN the narrowed value inside `Pass`
  (`okContent : (actual: Result) => Result<T, Fail>`) so the pipeline
  carries the narrowed value forward without a TS `asserts` — i.e.
  narrowing becomes data-flow, not control-flow. (b) is the
  idiomatic answer and should be preferred; (a) is the pragmatic
  fallback for the few sites that need a bare local binding.
- **Ergonomic verbosity vs the fluent chain.** `pipe(actual,
  toBe(expected))` is longer than `expect(actual).toBe(expected)` for
  the trivial single check (the corpus's dominant case — `toBe`
  dominated by call volume in the prior trip). Mitigation: a thin
  `check(actual, ...matchers)` entry keeps the single-check case to
  one call while staying data-first/data-last. The design must tune
  this so the common case isn't punished.

### 4. Boundary integrity — what plumbing is reused unchanged

The dependency and execution boundaries from the prior trip are
preserved; only the AUTHORING layer is rebuilt.

**Reused essentially unchanged (style-agnostic plumbing):**
- `Resolve/hook.ts` — `module.register` + `ts.transpileModule`
  execution; specifier resolution. No change.
- `Discovery/find.ts` — `*.spec.ts` glob. No change.
- `Core/Reporter.ts`, `Core/Registry.ts`, `Core/types.ts` (TestResult
  shape) — minor: TestResult is produced from a folded Assertion
  instead of a try/catch StepResult, but the OUTPUT shape stays.
- `Coverage/{v8,gate,config,sourcemap}.ts` — four-metric per-package
  coverage. No change.
- Watch (bin launcher re-exec) + `Cli/{cli,args}.ts` — no change.
- `Core/AssertionError.ts` — survives ONLY if option (a) narrowing
  throw is kept; otherwise it is reduced to an internal "body misused"
  signal.

**Rebuilt (the redesigned surface):**
- `Expect/*`, `Assert/assert.ts`, `Mock/vi.ts` → replaced by an
  `Assert/` (matchers + combinators returning `Assertion`) module.
  `Mock/vi.ts` (spies/stubs) is style-agnostic state plumbing — keep
  the capability, but re-expose spy *assertions*
  (`toHaveBeenCalledWith`) as matchers returning `Assertion`.

**Dependency boundary unchanged:** runtime dep = `plgg` only; Node
built-ins + `typescript` (devDep) for execution. The redesign in fact
*deepens* the dogfooding — assertions are built FROM `plgg`'s Result,
not a parallel error type.

**The load-bearing boundary DECISION (throw vs return-Result):**
Recommended structural stance — **assertions RETURN `Result`; the
runner collects the returned value; the body-return contract is the
verdict source; throwing is NOT the assertion mechanism.** A thrown
error is still caught by the runner (a real defect in a test), but it
is a *defect path*, not the *assertion path* — exactly mirroring
plgg's "domain returns `err`, `proc` catches throws as `Defect`". The
one permitted exception is the optional narrowing primitive (§3), and
even that should be preferred-replaced by value-carrying matchers.

### 5. Component taxonomy & top structural risks

**Taxonomy (by layer; the redesign touches only L0/L3):**
- **L0 pure domain (NEW):** `Assertion = Result<Pass,Fail>`, matchers
  `(expected)=>(actual)=>Assertion`, combinators (`not`,`all`),
  deep-equal (refactored from prior `equals.ts`), `Fail` formatting.
  Pure, fully testable, authored in house style.
- **L1 orchestration (REFACTOR seam):** Runner folds returned
  Assertions into TestResult; anti-false-green guard for void/throw
  bodies. Reporter unchanged.
- **L2 process edge (REUSE):** Discovery, Coverage, Resolver, Watch,
  CLI.
- **L3 authoring façade (NEW):** `test`/`describe`/hooks (Registry-
  backed) + the matcher/combinator exports + optional `check` sugar +
  optional narrowing primitive.

**Top structural risks (ranked):**
1. **Silent-dropped Result = false green (existential).** A body that
   computes an assertion but forgets to RETURN it (or returns the
   wrong one) passes vacuously. This is the redesign's signature
   hazard — the fluent-throw model couldn't have it. Structural
   mitigation: make `test`'s body type `() => Assertion |
   Promise<Assertion>` (not `=> void`), and have the Runner FAIL any
   test whose body resolves to a non-Assertion/void. Belt-and-braces:
   a meta-harness (plain throw) proving "a test that returns a Fail
   reports failed" and "a test that returns nothing reports failed".
2. **`assert`-narrowing survival (§3).** If narrowing must stay
   control-flow (throw), it's a sanctioned escape hatch in a
   no-escape-hatch codebase — needs explicit justification, or replace
   with value-carrying matchers. This is the #1 design decision after
   the throw-vs-return boundary.
3. **Async composition correctness.** Bodies returning `Promise<
   Assertion>` / `proc(...)` chains: the Runner must await and fold the
   inner Result; an async body that resolves to `Promise<Promise<...>>`
   or whose `proc` returns `Err(Defect)` must map to failed. The prior
   O2 unhandled-rejection window stays relevant.
4. **Ergonomic regression on the trivial check.** If the single-`toBe`
   case becomes 2× more verbose, contributors resent the idiom and the
   teaching-surface goal backfires. `check` sugar + careful naming is
   the structural lever; the design must demonstrate the common case
   reads well.
5. **Deep-equal fidelity (carried from prior art).** `toEqual`'s
   equality is still the single chokepoint all structural comparisons
   flow through; refactoring it to return `Assertion` must not change
   its semantics (undefined-prop drop, Box-closure drop, Map/Set/Date).

**Recommended structural seam:** keep L0 (matchers/combinators/Assertion)
completely independent of the Runner so it is provable in isolation,
and make the Runner's "fold a returned Assertion, fail on void/throw"
the single, small, well-tested change to the proven plumbing. That
ordering lets the redesign prove the new idiom AND the anti-false-green
guard before touching discovery/coverage/watch at all.

## Review Notes

(none yet)
