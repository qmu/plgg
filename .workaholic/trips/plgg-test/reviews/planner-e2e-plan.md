# Planner E2E + Parity Scenario Plan (Coding Phase)

Author: Planner (E2E / external-interface QA only)
Status: ready — staged for execution once the concurrent-launch gate clears
Scope: external validation of the plgg-test CLI from the outside. No unit
tests, no code review (those belong to Constructor / Architect).

This plan is bound to the 7 fixed Plan Amendments. Every scenario below
maps to a direction success criterion (SCn) and/or an amendment (An).

---

## 0. Dev-environment readiness (verified now)

- **Node**: local `v24.13.1`; CI pins `22.x`. Native
  `--experimental-strip-types` is default on v24, `fs.watch({recursive})`
  is supported on Linux ≥20, and `module.register` exists — all three
  design preconditions hold locally. Floor is Node ≥22 (matches CI).
- **npm**: 11.12.1.
- **`packages/plgg-test/`**: NOT yet present (Constructor is building it).
- **vitest**: `vitest`/`@vitest/coverage-v8` `^4.1.5` are declared in
  `packages/plgg/package.json` but **node_modules is not installed in this
  worktree** (`node_modules/.bin/vitest` absent). 
  **Action required before the parity gate**: run `npm ci`/`npm install` in
  `packages/plgg` to produce the vitest baseline. The parity gate compares
  AGAINST vitest, so vitest must run at least once here. (If install is
  undesirable, fallback baseline = capture vitest output from CI/main, but
  a local both-runners run on the same checkout is the trustworthy form.)
- **plgg corpus**: `packages/plgg/src` holds **74** `*.spec.ts` files —
  this is the file-SET parity denominator for the headline gate.
- **CLI invocation (per design §2.3)**: 
  `node --experimental-strip-types --import <register> packages/plgg-test/src/Cli/cli.ts [roots] [--watch] [--coverage]`,
  also exposed as the package `bin` and as `npm run test` in each package.
  Confirm the exact bin path/flags from Constructor's `package.json` at
  execution time.

---

## 1. Exit-code contract  (SC3, direction persona 2; design §1.6)

The agent-facing contract. Verified by running the CLI and checking `$?`.

| # | Setup | Invoke | Expected `$?` |
|---|---|---|---|
| 1a | A spec dir where all tests pass | run CLI (no flags) | **0** |
| 1b | Inject one deliberately failing `expect` into a temp spec | run CLI | **non-zero** (1) |
| 1c | Inject an `async` test whose promise rejects (no sync throw) | run CLI | **non-zero** — guards async-swallowing false green (design §4) |
| 1d | Point CLI at a dir/glob matching **zero** spec files | run CLI | **non-zero** — zero-expected-tests is a failure, not a pass (A-exit-rule) |
| 1e | An `assert(false)`-style narrowing assertion that fires | run CLI | **non-zero** |

Pass criterion: every row's actual `$?` equals expected. 1b/1c/1d/1e are
the false-green guards; a green exit on any of them is a hard fail of the
whole trip's core promise.

All scenarios run against a **temp copy** of specs (scratchpad), never by
mutating the real corpus.

---

## 2. `--watch`  (SC4, first-class acceptance criterion; design §1.7, A-watch)

Acceptance criterion (direction §6.4): editing a spec/source file reliably
triggers a fresh re-run with current results.

- **2a Spec edit triggers re-run**: launch `CLI --watch` in background;
  capture initial run output; touch/modify a watched `*.spec.ts`; confirm a
  SECOND run is emitted within a few seconds (allow for the ~100ms debounce
  from design §1.7), and that its results reflect the edit (e.g. flip a
  passing assertion to failing → the re-run shows the failure).
- **2b Source edit triggers re-run**: modify a non-spec `src/*.ts` that a
  spec imports; confirm a re-run fires (watch must observe source, not only
  specs).
- **2c Debounce/coalesce**: perform a rapid multi-write (simulate editor
  atomic save) and confirm it yields ONE re-run, not a storm.
- **2d Watch loop survives a failing run**: a failing test must NOT kill the
  watcher (design §1.7: watch prints verdict and waits); confirm the
  process stays alive and a subsequent fix triggers a passing re-run.
- **2e Watch is NOT the gating path**: confirm CI/agents use the one-shot
  exit-coded invocation, never the never-exiting watch path (my round-1
  minor note). Inspect the package `test` script vs `test:watch`.

Execution mechanics: run watch with `run_in_background`, poll output with a
Monitor/until-loop on a sentinel string in the captured log, then mutate the
file and poll for the next run marker. Hard timeout per wait to avoid hangs.

---

## 3. `--coverage`  (SC5, direction §6.5; design §1.8, A-coverage-process, A-coverage-verdict)

Amendment 1 fixes the mechanism: `--coverage` re-execs itself as a child
with `NODE_V8_COVERAGE=<tmpdir>` + strip-types/register flags, runs
in-process, then the parent folds the dumped V8 JSON and applies the gate.

- **3a Real number produced**: run `CLI --coverage` on `plgg`; confirm a
  real coverage summary (statements/branches/functions/lines percentages)
  is printed — not a placeholder, not zero, not "N/A".
- **3b Gate passes at/above threshold**: on the real corpus (which the repo
  expects to be >90%), confirm the gate PASSES and exits 0.
- **3c Gate FAILS under threshold**: temporarily exclude/remove a chunk of
  tests (temp copy) so coverage drops below 91, confirm the gate FAILS with
  non-zero exit and names the deficient metric. This proves the gate is real,
  not cosmetic — a coverage report that never fails is a false green for
  under-tested code.
- **3d `NODE_V8_COVERAGE` child re-exec is the named path**: confirm (from
  output/behavior) that the coverage run used the re-exec-with-env mechanism
  the amendment mandates, and that the tmp coverage dir is produced and
  consumed. (External-observable: a child process / tmp dir appears.)
- **3e Per-package ship-or-defer honesty (A-coverage-verdict)**: for each
  migrated package, confirm the definition-of-done states whether the >90%
  gate is enforced (accurate number) or explicitly deferred — never an
  ambiguous silent gap. plgg gates at 91; plgg-kit currently has none, so I
  will explicitly report which packages enforce vs defer.

---

## 4. PARITY GATE — the headline E2E  (SC2, direction §6.2; A-parity-file-set)

Trust by demonstration. Run BOTH vitest and plgg-test on plgg's REAL
corpus and require two equalities. This is MY external validation, not
Constructor's self-claim.

### 4a Discovered spec-file SET parity (closes partial-discovery false green)
- Capture vitest's discovered file set (e.g. `vitest list` / JSON reporter
  file list) → set V.
- Capture plgg-test's discovered file set (a `--list`/dry-run if provided,
  else parse its per-file run headers) → set P.
- **Require V == P** as sets (74 files expected). Any file in V but not P =
  a silently-unrun spec = hard fail. Report the symmetric difference if
  non-empty.

### 4b Per-test pass/fail verdict parity
- Run vitest with a machine-readable reporter (JSON) → map {test id →
  pass/fail/skip} = Verdicts_V.
- Run plgg-test, parse its per-test results → Verdicts_P.
- **Require Verdicts_V == Verdicts_P test-for-test.** Any divergence
  (esp. a vitest-fail that plgg-test reports pass) is the existential
  false green and a hard fail. Special attention to:
  - `toEqual` cases (348 calls — the #1 false-green vector, A-toEqual) over
    real `Datum`/`Dict`/Result/Option shapes, NOT synthetic objects.
  - `async`/`.resolves` cases (~252 async specs).
- Note: test-id alignment between the two reporters may need a normalization
  step (file + describe path + test name); I will define the join key when I
  see plgg-test's reporter format.

### 4c Resolver-hook acceptance fixture (A-resolver-fixture)
Before trusting any migration, confirm a fixture spec exercising all three
specifier shapes imports AND runs under plgg-test:
- self `"plgg/index"`, self deep `"plgg/Functionals/bind"`, cross-package
  bare `"plgg"`. If any specifier fails to resolve, discovery/exec is
  unsound and parity numbers are meaningless — so this runs FIRST.

### 4d Migration edit-surface verification (A-migration-two-tier)
- Confirm the import-source codemod (`"vitest"` → `"plgg-test"`) was applied
  by a checked-in script, not by hand, across all spec files.
- Confirm the ONE enumerated hand-touched spec
  (`plgg-kit/.../generateObject.spec.ts`) had its `vi.mock` removed via
  `postJson` dependency injection, and that the injected DEFAULT still calls
  the real `postJson` (a behavior-parity check on the one product-code edit —
  my round-1 Design Concern 2). No ESM module-mock engine should exist.

---

## 5. Cross-package smoke (SC6 boundary, optional after plgg parity)

After plgg parity holds, smoke-run plgg-test on a second package (e.g.
plgg-kit, which has cross-package `from "plgg"` + its own alias) to confirm
the resolver handles cross-package + uneven-coverage packages. Confirms the
dependency-reduction story: with vitest dropped, `node_modules` /
Dependabot surface measurably shrinks (capture a before/after dep count).

---

## 6. Execution discipline

- All mutating scenarios operate on temp copies under the scratchpad; the
  real corpus is never edited for a test.
- Background processes (watch) use `run_in_background` + Monitor polling with
  hard timeouts; always tear down spawned watchers.
- Each scenario records: command, observed `$?`/output excerpt, PASS/FAIL.
- I will NOT run anything against Constructor's code until the team lead
  confirms the concurrent-launch gate has cleared.

## Review Notes

(none yet)
