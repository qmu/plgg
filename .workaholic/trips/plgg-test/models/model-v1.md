# Model v1

Author: Architect
Status: draft
Reviewed-by: none

## Content

### 0. Grounding — what I actually read

All claims below are grounded in the current worktree
(`.worktrees/work-20260623-170403`):

- **Runner today:** every package's `package.json` test script is
  `tsc --noEmit && vitest --run` (read `packages/plgg/package.json`).
  `test:watch` is bare `vitest`; `coverage` is `vitest --run
  --coverage`. So vitest does discovery, execution, assertion, watch,
  and (via `@vitest/coverage-v8`) coverage today.
- **Script family:** `scripts/` holds a per-package set of
  `test-<pkg>.sh`, `test-watch-<pkg>.sh`, `tsc-<pkg>.sh`,
  `tsc-watch-<pkg>.sh`, plus `coverage-plgg.sh`, `build.sh`,
  `check-all.sh`, `menu.sh`. Each `test-<pkg>.sh` just `cd`s into the
  package and runs `npm run test` (read `scripts/test-plgg.sh`,
  `scripts/check-all.sh`). This shape matters for the
  **command-scripts policy** (one canonical runner, no new bespoke
  per-command scripts).
- **Coverage config:** `packages/plgg/vite.config.ts` sets
  `coverage.provider: "v8"`, `reporter: ["text","lcov","html"]`,
  a curated `exclude` list, and **thresholds of 91** on
  statements/branches/functions/lines (the ">90%" rule from
  `feedback_coverage_threshold`). Other packages (e.g. plgg-kit)
  have a thinner `coverage: { all: true }` block with no thresholds —
  so the coverage story is **already uneven**, which is the
  "coverage may need correcting" the direction names.
- **Test API surface actually used** (grepped across all 132
  `*.spec.ts`):
  - Imports: **100% from `"vitest"`** (132/132 files). Symbols:
    `test` (125), `expect` (120), `assert` (64), `vi` (3 files),
    `it` (3), `describe` (3), `afterEach` (1 file; `beforeEach`/
    `afterAll`/`beforeAll` appear in plgg-view/plgg-server too).
  - Matchers (by frequency): `toBe` 1442, `toEqual` 348,
    `toContain` 103, `.resolves` 24, `.not` 24, `toHaveLength` 21,
    `toHaveProperty` 8, `toBeInstanceOf` 7, `toThrow` 6 (forms:
    `toThrow()`, `toThrow(string)`, `toThrow(Error)`,
    `not.toThrow()`), `toBeUndefined` 4, `toBeGreaterThan` 3,
    `toBeDefined` 3, `toBeNull` 1, `toBeGreaterThanOrEqual` 1.
    `.not.*`: toBe, toContain, toThrow, toBeInstanceOf, toBeNull,
    `toHaveBeenCalled`.
  - `vi.*` surface: `vi.fn` (7), `vi.stubGlobal` (2),
    `vi.unstubAllGlobals` (1), `vi.stubEnv` (1), `vi.unstubAllEnvs`
    (1), `vi.mock` (**1**, only in
    `plgg-kit/.../generateObject.spec.ts`).
  - ~208 `async`/awaited tests; `await expect(p).resolves.toBe(...)`
    is the dominant async-assertion form.
- **Module resolution in specs:** two patterns.
  - *Intra-package:* `from "plgg/index"` (74×) and
    `from "plgg/Functionals/bind"` — resolved at runtime by the vite
    `resolve.alias` mapping `plgg -> ./src` (read
    `packages/plgg/vite.config.ts`) and at type-check by the tsconfig
    `paths: { "plgg*": ["./src/*"] }`.
  - *Cross-package:* plgg-kit specs do `from "plgg"` (bare) +
    `from "plgg-kit/index"`. plgg-kit depends on `plgg` via
    `"plgg": "file:../plgg"` and `from "plgg"` resolves to plgg's
    **built dist** through node_modules; `plgg-kit/*` resolves via its
    own alias/paths. `check-all.sh` therefore `build.sh`-es all dists
    first, in dependency order, before any test runs.
- **TS execution capability on this host:** Node **v24.13.1**
  (native type-stripping is default ≥23.6; `--experimental-strip-types`
  ≥22.6), and **`tsx` v4.22.4** is resolvable via `npx`. So executing
  `*.spec.ts` without vitest/esbuild-the-bundler is feasible.
- **tsconfig:** `module: NodeNext`, `isolatedModules: true`,
  `erasableSyntaxOnly: true`, `verbatimModuleSyntax`-compatible
  strictness — i.e. the code is already written to be
  **type-erasable**, which is exactly the precondition Node's native
  strip-types loader and `tsx` require.
- **Prettier:** every package carries `.prettierrc.json` with
  `printWidth: 50` (read `packages/plgg/.prettierrc.json`).

### 1. System Coherence — business need → structural components

| Business need (direction v1) | Structural component in plgg-test |
| --- | --- |
| Familiar authoring, minimal spec edits (SC1) | **Test DSL**: `describe`/`it`/`test`/`expect`/`assert` + the closed matcher set actually used |
| Verdict parity then removal (SC2) | **Runner core** with the *same* pass/fail semantics; a parity harness runs corpus under both runners |
| Correct gating exit code (SC3) | **Reporter + process boundary**: aggregate result → `process.exitCode` (0 / non-0), never swallow a failure |
| Working watch loop (SC4) | **Watcher** over `node:fs.watch` driving re-run of the runner core |
| Honest coverage outcome (SC5) | **Coverage collector** via `node:inspector` V8 profiler + threshold gate, OR explicit deferral with named follow-up |
| Dependency reduction (SC6) | **Boundary discipline**: depend only on `plgg` + Node built-ins; remove `vitest`/`@vitest/coverage-v8`/`vite-plugin-dts`-test-path from devDeps |
| `vi.fn`/`stubGlobal`/`stubEnv`/`mock` used by 3 files | **Test-double seam** (`fn`, `stubGlobal`, `stubEnv`); `vi.mock` flagged as the single structural outlier (see §5) |

The mapping is coherent: every must-have in the direction lands on
exactly one owned component, and the only consumer (plgg itself)
bounds each component's surface to what the corpus uses.

### 2. Domain Model of a minimal test framework

Entities (the ubiquitous vocabulary, shared with the existing corpus):

- **Suite (`describe`)** — a named grouping node. Has a name,
  child suites, child tests, and lifecycle hooks. Nesting is a tree;
  the root suite is the file itself. Existing corpus uses `describe`
  in only 3 files, so nesting is shallow — but must exist.
- **Test (`it` / `test`)** — a named unit holding a body
  (`() => void | Promise<void>`). States: *pending → running →
  passed | failed | skipped*. `test` and `it` are aliases (corpus
  uses both). A skip path is required (direction §3).
- **Hook** — `beforeEach`/`afterEach`/`beforeAll`/`afterAll`,
  scoped to a suite. Corpus uses `afterEach`/`beforeEach`
  (plgg-fetch, plgg-view, plgg-server); these must run in correct
  order and must run on the teardown side even when a test throws.
- **Assertion / Expectation (`expect`)** — wraps an actual value and
  exposes the closed matcher set. Two outcomes only: satisfied
  (no-op) or **AssertionError thrown** (carrying expected/actual for
  the reporter). `assert(cond)` is a narrowing assertion used 64×,
  often as a type guard (`assert(isOk(x)); x.content` relies on TS
  `asserts`), so its signature must be `asserts condition`.
- **Matcher** — a pure predicate over (actual, expected?) producing
  pass + a message. Members fixed by §0's frequency list. `.not`
  inverts; `.resolves`/`.rejects` adapt a Promise actual to a sync
  matcher. This is the *only* place equality semantics live
  (`toBe` = `Object.is`; `toEqual` = structural/deep equality —
  the single subtlest correctness surface).
- **Runner** — orchestrates: for each discovered file, build its
  suite tree by executing the module (registration side-effects),
  then walk the tree depth-first executing hooks + tests, collecting
  **TestResult**s. Pure orchestration over the domain tree; no I/O
  beyond importing modules.
- **Discovery** — given roots + a glob (`**/*.spec.ts`) and the
  config `exclude` list, yields the ordered set of spec file paths.
- **Reporter** — folds `TestResult[]` into a human summary (text;
  optionally TAP-ish) **and** a single boolean verdict that becomes
  the exit code. The safety-critical fold (SC3).
- **Watcher** — observes source + spec files; on change, debounces
  and re-invokes Runner over the affected (or full) set, re-printing
  via Reporter. Stateful, lives at the process edge.
- **Coverage** — starts the V8 profiler before execution, takes the
  precise coverage after, maps byte ranges back to source, applies
  `exclude`, computes the four percentages, and gates against
  thresholds (91). The component with the largest unknowns (§5).
- **TestDouble (`fn`/`stubGlobal`/`stubEnv`)** — records calls /
  swaps a global or env var and restores it. Small, corpus-bounded.

Aggregates & relationships: Suite *contains* Suite/Test/Hook
(composition tree). Runner *produces* TestResult from Test.
Reporter *consumes* TestResult, *produces* Verdict. Watcher
*drives* Runner. Coverage *wraps* Runner's execution. The DSL is the
*registration façade* that builds the Suite tree as a side effect of
importing a spec module — mirroring vitest's globals-via-import model
the corpus already assumes.

### 3. Translation-Fidelity Analysis — does "minimum but real, vitest-compatible-enough" map cleanly?

Mostly **yes**, with three named friction points:

1. **Clean (high fidelity):** `describe/it/test/expect/assert` plus
   the matcher list is a *closed, knowable set* (§0). There is no
   open-ended ecosystem surface to chase — the corpus is the spec.
   `toBe`/`toEqual`/`toContain` alone cover 1893/2000+ matcher calls;
   getting those three exactly right covers the vast majority of
   verdicts. This is the strongest argument that "minimum but real"
   is genuinely achievable.

2. **Friction — import source (SC1).** Specs import the API from
   `"vitest"` in 132/132 files. The cleanest migration is a single
   mechanical rewrite of the import source to `"plgg-test"` (e.g.
   `from "vitest"` → `from "plgg-test"`). That is one find-replace
   per file — "minimal, mechanical" as SC1 demands — but it is **not
   zero**, and it is the same edit ×132, so it must be scripted/
   verified, not hand-done. (A globals injection alternative exists
   but fights the corpus's explicit-import convention; recommend the
   explicit-import rewrite.)

3. **Friction — `vi.mock` (the one true outlier).** `vi.mock("plgg",
   factory)` in `generateObject.spec.ts` is **hoisted module
   mocking**: vitest rewrites the module graph so the spec's `import
   { ... } from "plgg"` resolves to the factory's result, while the
   factory itself can call `importOriginal()`. This requires a module
   loader/interception hook — it does **not** map cleanly onto a
   minimal runner and is the single highest-fidelity-loss item. It
   touches exactly one file. Translation options (for downstream to
   decide, not me): (a) implement a thin `node:module`
   register/loader hook that supports a `mock(spec, factory)`
   registry; (b) refactor that one spec to inject the network seam
   (`postJson`) explicitly rather than mock the module — the
   direction explicitly permits breaking changes and "refactor low-
   quality seeds." Either is bounded; (b) keeps the runner minimal.

4. **Fidelity nuance — `toEqual` semantics.** vitest's `toEqual`
   has specific rules (ignores `undefined` props, handles
   Map/Set/Date/typed arrays, recursion). 348 calls depend on it.
   "Compatible-enough" means our deep-equal must match vitest's on
   the *shapes the corpus actually compares* (plain objects, arrays,
   Result/Option `Datum`/`Dict` structures), verified by parity
   (SC2), not by reimplementing vitest's full algorithm. This is the
   place where a subtle divergence would produce a **false green** —
   the existential risk — so it is the #1 thing the parity gate must
   cover.

Verdict: the translation is faithful for ~99% of the surface by call
volume; the residual is two concrete, single-file/single-semantic
items, both with bounded resolutions.

### 4. Boundary Integrity — dependencies & avoidance of third-party deps

The whole point of the trip is shrinking the dependency tree, so the
boundary is a *hard* design constraint, not a preference.

**Allowed inside the boundary:**
- `plgg` itself (runtime dep `"plgg": "file:../plgg"`), so the
  framework is authored in house style — `Option` for "maybe a
  value," `Result`/`proc` for fallible/async steps, exhaustive
  `match`, no escape hatches. This makes plgg-test *dogfood* plgg,
  reinforcing the identity-alignment argument in the direction.
- **Node built-ins only:** `node:fs`/`node:fs/promises` (discovery,
  reads), `node:path`, `node:fs.watch` (watcher), `node:inspector`
  (V8 coverage), `node:module` (only if module-mock route chosen),
  `node:process` (exit code), `node:util`/`node:assert` internals if
  helpful. No bundler, no transpiler-as-library at runtime.

**The TS-execution boundary question (structural risk #1, §5).**
Running `*.spec.ts` directly needs *some* TS handling. Three options,
ranked by boundary cleanliness:
- (a) **Node native strip-types** (`node --experimental-strip-types`
  / default on v24): zero added deps, perfectly aligned with
  `erasableSyntaxOnly: true` in tsconfig. Cleanest boundary; the
  recommended primary path. Caveat: path aliases (`plgg/index`,
  `plgg-test/index`) are *not* resolved by Node — needs either a tiny
  `node:module` resolve hook (in-house, built-in only) or a
  per-package `imports`/subpath strategy.
- (b) **`tsx`** (already present, v4.22.4): handles TS + aliases out
  of the box, but it bundles esbuild — i.e. it *reintroduces a
  third-party dep*, partially undercutting SC6. Acceptable as a
  fallback, not as the headline.
- (c) Pre-`tsc`-to-JS then run: leans on the already-present
  `typescript` devDep (which stays for `tsc --noEmit` regardless),
  no *new* dep, but adds a build step and a dist-vs-src resolution
  layer. Heavier.
  Recommendation to carry into design: **(a) as primary**, with the
  alias resolution handled by an in-house built-in-only loader hook;
  (b) as documented fallback.

**What leaves the boundary (the deletion side of SC6):** remove
`vitest`, `@vitest/coverage-v8` from every package's devDeps; the
`test`/`coverage` scripts stop invoking `vitest`; `vite.config.ts`'s
`test`/`coverage` blocks become dead for testing (build config may
stay for `vite build`). This is the measurable tree-shrink.

**Command-scripts policy boundary:** plgg-test must expose **one
canonical CLI** (e.g. `plgg-test [globs] [--watch] [--coverage]`)
that each package's `npm run test` invokes — NOT a new fan of
bespoke `scripts/*.sh`. The existing `test-<pkg>.sh` wrappers can
keep delegating to `npm run test`; only the *package script body*
changes from `vitest --run` to the plgg-test CLI. This respects
`feedback_command_scripts_policy`.

### 5. Component Taxonomy & Structural Risk Areas

**Taxonomy (by structural layer):**

- **L0 Pure domain (no I/O):** Suite/Test/Hook tree types,
  TestResult, Verdict, Matcher predicates, deep-equal, AssertionError.
  *Most code lives here; fully unit-testable; house-style Result/
  Option fits naturally.*
- **L1 Orchestration:** Runner (tree walk + hook ordering +
  per-test try/catch → TestResult), Reporter (fold → text + Verdict).
- **L2 Process edge (effectful):** Discovery (`fs`), Watcher
  (`fs.watch`), Coverage (`node:inspector`), CLI entry
  (arg parse → exit code), TS-execution/loader hook.
- **L3 Authoring façade:** the `describe/it/test/expect/assert/fn/
  stubGlobal/stubEnv` exports — the module specs import.

**Structural risk areas (ranked):**

1. **Coverage without a third-party instrumenter (highest
   uncertainty).** Today coverage = `@vitest/coverage-v8`. Doing it
   in-house means `node:inspector` Session → `Profiler.enable` +
   `takePreciseCoverage`, then mapping V8 byte ranges to lines and
   applying the existing `exclude` list and 91 thresholds. This is
   real engineering with sharp edges (source maps, range→line
   mapping, the `all: true` "count un-executed files" behavior).
   The direction (§5, SC5) *explicitly permits deferral with a named
   follow-up* — so the structural recommendation is: **gate on
   describe/it/expect parity first; treat coverage as a separable
   second component** that either ships or is deferred honestly. Do
   not let coverage block the parity-proven core.
2. **Executing TS specs without heavy deps** (see §4): solvable via
   Node native strip-types, but **alias resolution**
   (`plgg/index`, `plgg-kit/index`, cross-package `from "plgg"`) is
   the concrete hard part — it is what vite's `resolve.alias` does
   for free today. Needs a small in-house resolve hook or a
   subpath-`imports` strategy. Risk is moderate and bounded.
3. **`toEqual` deep-equality fidelity** (§3.4): the #1 false-green
   vector. Mitigated by the SC2 parity gate, but it is *structural*
   because the equality algorithm is a single chokepoint all 348
   calls flow through.
4. **`vi.mock` module mocking** (§3.3): the one API that resists a
   minimal design; isolate it (one file) and pick refactor-vs-loader
   early so it doesn't bleed complexity into the runner core.
5. **Watch reliability** (`fs.watch` is OS-dependent, fires
   duplicate/rename events, and editors do atomic-save renames):
   needs debouncing + re-add-on-rename. Bounded but easy to get
   subtly wrong (SC4).

**Recommended structural seam:** keep L0/L1 (the parity-critical
core) completely free of L2 concerns, so the core can be proven
against the corpus *before* watch/coverage/TS-loader land. That
ordering directly serves the direction's "verdict parity, then
removal" north star.

## Review Notes

(none yet)
