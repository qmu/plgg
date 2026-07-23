# Coding Discovery — Architect (QA review prep)

- **Author**: Architect
- **Phase/Step**: coding / concurrent-launch (analytical prep, no test execution, no code change)
- **Date**: 2026-06-24
- **Purpose**: ground per-ticket reviews so each review is a *comparison* against this verified inventory, not a re-discovery.

## 0. Headline: a NEW blocker not in design-v2 or any model — DOM environment

**4 spec files declare `// @vitest-environment happy-dom`** and depend
on a live DOM (`document`, `window`, `window.happyDOM`,
`getBoundingClientRect`, `createElement`). vitest provisions this from
the magic comment + the `happy-dom` devDep. **plgg-test has NO
environment seam** — `Cli/args.ts` parses only `--watch`/`--coverage`;
the runner runs under plain Node. These files will crash with
`document is not defined` / `window is not defined` the instant they run
under `plgg-test src`.

| File | ticket | DOM refs | severity |
| --- | --- | --- | --- |
| `example/src/app.spec.ts` | U2-example (sequenced FIRST as "trivial 1-file") | 19 | BLOCKER |
| `plgg-view/src/Program/usecase/render.spec.ts` | U2-plgg-view | 66 | BLOCKER |
| `plgg-view/src/Program/usecase/application.spec.ts` | U2-plgg-view | 33 | BLOCKER |
| `plgg-view/src/Program/usecase/sandbox.spec.ts` | U2-plgg-view | 4 | BLOCKER |

This is the single biggest gap in the plan. Neither design-v1/v2 nor
model-v1/v2 nor the tickets mention `@vitest-environment` or a DOM
runtime. The U2-example ticket is mis-sized — it is NOT a trivial
mechanical migration; it is gated on DOM provisioning. **Options for the
team** (a decision is owed before U2-example/plgg-view run):
1. Teach plgg-test to honor a DOM environment — e.g. a
   `// @plgg-test-environment happy-dom` directive (or a per-package
   config key) that imports + installs `happy-dom`'s `Window` onto
   `globalThis` before the spec module loads. This is the faithful,
   capability-raising path (Direction Criterion 4), but it is real
   runner work in `Cli`/`Resolve` (a setup seam before module import),
   not a leaf edit.
2. Inject the DOM in each spec's own setup (import `happy-dom`'s
   `Window`/`GlobalRegistrator` at top of file) without runner support —
   keeps plgg-test untouched but pushes env-bootstrap into every DOM
   spec; must avoid `as`/`any` when assigning to `globalThis`.
3. Re-scope: these 4 files are the genuinely hard part of the whole
   trip; size their tickets accordingly and do not let them ride in a
   "mechanical" batch.

Recommend surfacing immediately so U1 can absorb the env capability (it
is the natural sibling of R1/toThrow refinements) rather than discovering
it mid-U2.

## 1. Per-package migration inventory (58 files, verified)

Counts re-confirmed against the tree; they match the Constructor's
design-v2 except where flagged.

| Package | spec files | special cases |
| --- | --- | --- |
| example | 1 | **DOM blocker** (app.spec) |
| plgg-http | 5 | none (pure value matchers) |
| plgg-view | 11 | **3 DOM blockers** (render/application/sandbox); application also has beforeEach+afterEach |
| plgg-router | 8 | none |
| plgg-sql | 4 | none |
| plgg-fetch | 4 | **toThrow×1** (seam:74); `request.spec` has vi.fn/stubGlobal/unstubAllGlobals + afterEach |
| plgg-server | 14 | **toThrow×2** (bun:59, deno:63 `.not.toThrow()`); `serve.spec` afterEach |
| plgg-kit | 5 | **vi.mock×1** (generateObject:27, 4 live tests → DI); **skip-timeout×6** |
| plgg-foundry | 6 | **toBeGreaterThanOrEqual×1** (runFoundry:35); **skip-timeout×4** |

## 2. Special-case sites (exact, for comparison-review)

- **toThrow = 3** — `plgg-fetch/Http/usecase/seam.spec.ts:74`
  (`.toThrow()`), `plgg-server/bun.spec.ts:59` (`.not.toThrow()`),
  `plgg-server/deno.spec.ts:63` (`.not.toThrow()`). No plgg-test
  matcher; needs `throws()` helper (U1) or per-site try/catch. For the
  two `.not.toThrow()` sites the migrated assertion must prove the thunk
  did NOT throw — easy to get backwards; review for inverted logic.
- **skip-timeout 3rd arg = 10** — plgg-kit: `generateObject.spec.ts`
  :178/:201/:224, `Google.spec.ts:53`, `OpenAI.spec.ts:53`,
  `Anthropic.spec.ts:52`. plgg-foundry: `runFoundry.spec.ts:36`,
  `blueprint.spec.ts:25`, `TodoFoundry.spec.ts:31`,
  `ProfileFoundry.spec.ts:22`. All on `test.skip`. Rewrite must **drop
  the trailing number** (tsc TS2554 otherwise). Review: confirm the arg
  is removed, not preserved.
- **vi.mock = 1** — `plgg-kit/LLMs/usecase/generateObject.spec.ts:27`,
  mocking plgg's `postJson`; backs **4 live (non-skipped) tests**
  (lines 80/99/117/135). Needs DI redesign — review that the 3 vendor
  envelopes (OpenAI/Anthropic/Google) are still exercised offline and
  not weakened to skips, and that no `as`/`any` is introduced injecting
  the seam.
- **toBeGreaterThanOrEqual = 1** — `plgg-foundry/Foundry/usecase/
  runFoundry.spec.ts:35` (`todos.size >= 1`). Needs R1 matcher (U1).
- **.rejects = 0** — confirmed (model-v2 reconciliation stands).

## 3. vi.* / hooks distribution (for review of stub teardown fidelity)

- `vi.fn`, `vi.stubGlobal`, `vi.unstubAllGlobals` — only
  `plgg-fetch/.../request.spec.ts` (+ `afterEach` teardown). All exist
  in plgg-test's `vi`; teardown body unchanged.
- `vi.mock`, `vi.stubEnv`, `vi.unstubAllEnvs` — only
  `plgg-kit/.../generateObject.spec.ts` (vi.mock = the DI gap; stubEnv/
  unstubAllEnvs exist in plgg-test).
- **Hooks (`afterEach`/`beforeEach`)** in 3 files:
  `plgg-fetch/request.spec` (afterEach → unstubAllGlobals),
  `plgg-server/Serving/serve.spec` (afterEach),
  `plgg-view/Program/application.spec` (beforeEach + afterEach, DOM
  teardown). All re-export from plgg-test `Core/Registry`.
- **assert-narrowing** concentrated in: `plgg-server/Ssg/renderRoutes`
  (8), `generateObject` (7), `plgg-foundry/operate` (3),
  `writeStatic` (2), then singles. These convert to
  `okThen`/`errThen`/`someThen`/`shouldBe*`.

## 4. House reference idiom (the review bar)

From migrated `plgg` (`Basics/CamelCase.spec.ts`,
`Functionals/tap.spec.ts`):
- Import data-last names from `"plgg-test"`:
  `test, check, all, toBe, toEqual, okThen, shouldBeErr, vi, deepEqual`.
- A test body **RETURNS** its assertion: `test("…", () => check(x, m))`
  or `test("…", () => all([check(...), check(...)]))`. Multiple checks →
  `all([...])`, never sequential side-effecting `check()` calls whose
  results are discarded.
- Narrowing is data-flow: `check(asX(...), okThen((v) => toBe(y)(v.content)))`
  or `shouldBeErr()`; never `assert(...)` (no such export, by design).
- Spy "was/not called": `check(spy.mock.calls.length, toBe(n))` and
  `check(spy.mock.calls.some((c) => deepEqual(c, [...])), toBe(true))`.

**Anti-patterns to REJECT in review:**
- any `as` / `any` / `ts-ignore` (including copied from plgg's own
  pre-existing violations in `postJson.spec`/`proc.spec` — must NOT be
  propagated; prefer the typed `vi.stubGlobal` seam);
- a `check(...)` whose result is NOT returned/aggregated (a side-effect
  call that the runner never sees → silent false-green);
- a weakened assertion (e.g. `toBe(true)` replacing a specific value
  check, or a dropped `.not` negation);
- a dropped narrowing (using the raw value without `okThen`/guard where
  vitest had `assert(isOk(...))`);
- a preserved skip-timeout arg (tsc failure);
- `vi.mock` left in place (no runner support).

## 5. Gate B pre-flight — deepEqual vs vitest toEqual (my structural opinion)

Read `Expect/equals.ts` + `equals.spec.ts`. **Opinion: deepEqual is
structurally sound for Box-tagged Option/Result, and the parity gate is
very likely to pass — with ONE coverage gap to close in U1.**

Why it works on plgg domain values:
- `Object.is` primitives → matches vitest (`NaN===NaN`, `-0≠0`). ✓
- `undefined`-valued props ignored on either side → matches vitest
  `toEqual`; correct for plgg optional props / `None`-ish shapes. ✓
- **Function-valued props dropped** — the keystone for Box equality:
  `ok(42)` carries closures (`isOk`/`isErr`) whose identity differs
  between two distinct instances; dropping functions makes
  `toEqual(ok(x), ok(x))` pass, exactly as vitest does. This is the
  right call and is the reason Result/Option compare structurally. ✓
- Arrays/Map/Set/Date/RegExp all structural, tag-checked. ✓

**Coverage gap to require in U1's Gate B:** the existing `equals.spec.ts`
proves the *mechanisms* (incl. the `{a, f:()=>…}` function-drop case)
but does **not** assert a single end-to-end Box-tagged value — e.g.
`deepEqual(ok(some(1)), ok(some(1))) === true`,
`deepEqual(ok(1), err(1)) === false` (different `__tag`),
`deepEqual(err(invalidError(...)), err(invalidError(...)))` over a
nested `InvalidError`. These are the shapes the 81 `toEqual` corpus
sites actually compare. **Review stance for U1**: I will approve the
parity gate only if it adds at least these nested-Box assertions (or an
equivalent corpus-shaped fixture) and they pass; the mechanism tests
alone are necessary but not sufficient evidence of toEqual parity.

CAVEAT noted in source: deepEqual assumes ACYCLIC inputs (no cycle
guard). The plgg corpus is acyclic, so this is fine — but if any
migrated spec compares a self-referential structure, flag it.

## 6. Confirmed facts that need no further review

- Shell wrappers (`test-*.sh`, `test-watch-*.sh`, `tsc-*.sh`) and
  `check-all.sh` — runner-agnostic, zero edits. ✓
- No root vitest config/devDep. ✓
- Alias resolution — all 9 tsconfigs use `"<pkg>*": ["./src/*"]` (or
  `/*`); `example` uses relative imports only; `deriveAliases` handles
  both. ✓
- Runner fails-not-crashes on a thrown/rejected body — CONFIRMED in
  model-v2 (underpins the 24 `.resolves` → `check(await p, …)`
  rewrites). ✓
