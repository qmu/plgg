# Coding-Phase E2E + Parity Validation — Planner

Author: Planner (E2E / external-interface QA)
Status: complete
Validated against: Constructor's committed code at `c23b0ce` (working
tree clean), plus vitest 4.1.5 baseline installed in `packages/plgg`.
Method: external execution of the CLI / runner from the outside. All
mutating scenarios ran on temp copies under the session scratchpad;
the real corpus was never edited.

## Headline verdict

**PASS overall.** The runner is trustworthy on the dimension that
matters most: it agrees with vitest test-for-test on the real corpus
(465/465), discovers the identical file set (74/74), and its
exit-code contract — including the false-green guards — holds. Watch
works (re-run on spec + source edit, debounce, survives failures).
Coverage produces a real gated number BUT is **lines-only at a >90
gate**, narrower than vitest's four-metric >91 gate — a real,
honestly-reportable partial-delivery against Amendment 6, not a false
green. One product-code edit (`vi.mock` removal) and one watch
limitation (stale ESM module cache on source re-run) are flagged
below for Constructor.

---

## Scenario results

### 1. Exit-code contract (SC3) — ALL PASS

Ran the CLI (`node bin/plgg-test.mjs src`) on temp specs, checked `$?`:

| # | Scenario | Expected | Actual | Verdict |
|---|---|---|---|---|
| 1a | all tests pass | exit 0 | 0 | PASS |
| 1b | a failing `expect` | non-zero | 1 | PASS |
| 1c | async test whose promise rejects (no sync throw) | non-zero | 1 | PASS (async-swallow guard holds) |
| 1d | zero spec files discovered | non-zero | 1 | PASS (zero-tests guard holds) |
| 1e | a firing `assert(false)` | non-zero | 1 | PASS |

1c and 1d are the two most safety-critical false-green guards; both
hold. The reporter's `exitCodeFor` is correct: exit 0 only when
`failed === 0` AND `passed + failed > 0`.

### 2. `--watch` (SC4) — ALL PASS (one limitation noted)

Launched `bin/plgg-test.mjs src --watch` in the background, observed
the log across edits:

| # | Scenario | Result | Verdict |
|---|---|---|---|
| 2a | edit a spec → fresh re-run with new result | re-run fired, flipped pass→fail correctly | PASS |
| 2b | edit a source `.ts` the spec imports → re-run | re-run fired | PASS (see limitation) |
| 2c | 5 rapid writes (~50ms) → debounce | coalesced to exactly 1 re-run | PASS |
| 2d | a failing run must not kill the loop | watcher stayed alive; subsequent edit re-ran | PASS |

Initial run correctly discovered exactly 1 test in a clean temp dir;
the debounce is the ~100ms the design specifies.

**Limitation (flag to Constructor, not a blocker):** on a SOURCE-file
edit (2b) the watcher re-runs but the re-run reflects the OLD module
because Node's ESM module cache is not busted between in-process
re-runs — I changed `lib.ts` to return 2, the spec expecting 1 still
reported PASS on re-run. So watch reliably RE-RUNS on source change
(the SC4 acceptance criterion is met), but the re-run can show stale
results for changed non-spec source until the process restarts. Spec
edits are unaffected (each spec file is freshly imported). Worth a
follow-up (cache-bust by URL query, or a note that source edits need a
watch restart).

### 3. `--coverage` (SC5, Amendment 1 + 6) — PASS with a scope gap

| # | Scenario | Result | Verdict |
|---|---|---|---|
| 3a | real number produced on plgg corpus | **99.10% line coverage (3967/4003)** printed per-file + total | PASS |
| 3b | gate passes at/above threshold | exit 0, "Coverage gate passed (> 90%)" | PASS |
| 3c | gate fails under threshold | unexecuted lines inside a reached function → **29.41%, gate FAILED, exit 1** | PASS |
| 3d | `NODE_V8_COVERAGE` child re-exec path | observed the bin spawn `…gate.ts /tmp/plgg-test-cov-XXXX …/src` — the Amendment-1 re-exec + parent post-pass, exactly as specified | PASS |

**Scope gap (Amendment 6 honesty — must be recorded as ship-or-defer):**
the coverage implementation computes and gates **line coverage only**,
at a **`> 90`** threshold. The pre-existing vitest config gated **four
metrics (statements/branches/functions/lines) at 91**. So plgg-test's
gate is real and honest but NARROWER than what it replaces:
- lines-only, not the four metrics the design §1.8 promised "all four
  via V8 ranges";
- threshold 90, not 91.

This is not a false green (the line number is real and the gate does
fail on genuinely under-executed code — 3c proves it). But it is a
weaker safety net. Per Amendment 6 the definition of done must record
this as an explicit verdict: either tighten to four-metric/91 parity
before vitest is dropped, or DEFER with a named follow-up — never
leave it ambiguous.

**Coverage-accuracy edge case (inform Constructor):** a whole
top-level function that is never CALLED can still score as
line-covered (a temp file with 3 entirely-unused functions reported
100%). This is the known V8 block-range proxy limitation the design
flagged; it means uncalled functions can inflate the line number.
Executed-but-unexercised lines ARE caught (3c). Branch/function
metrics would close this gap — another argument for the four-metric
follow-up.

### 4. PARITY GATE (SC2, Amendment 3) — PASS (the headline)

Constructor had ALREADY run the import codemod: all 74 plgg specs
import from `"plgg-test"`, 0 from `"vitest"` (so a plain `vitest --run`
now exits 1 with "No test suite found" — EXPECTED post-migration, NOT
a divergence). I captured the vitest baseline by running it on a temp
copy of `packages/plgg` with imports reverted to `"vitest"`.

**4a — discovered spec-file SET parity:** vitest `list` = 74 files;
plgg-test (`PLGG_TEST_PRINT_FILES=1`) = 74 files; `comm` of the two
sorted sets = **identical, zero difference**. Closes the
partial-discovery false green.

**4b — per-test pass/fail verdict parity:** captured vitest verdicts
via JSON reporter (465 tests, all passed) and plgg-test verdicts via a
harness that calls Constructor's own `discover` + `runFile` and dumps
each `TestResult`. After canonicalizing the describe-separator
(vitest joins with space, plgg-test with " › "):
- vitest canonical keys: **465**; plgg-test canonical keys: **465**
- keys only in vitest: **0**; only in plgg-test: **0**
- shared keys: **465**; **verdict divergences: 0**
- both: 465 passed, 0 failed, 0 skipped

**RESULT: perfect test-for-test parity on the real corpus**, exercised
over the actual `Datum`/`Dict`/Result/Option shapes (the `toEqual`
false-green vector and the ~252 async/`.resolves` tests are all inside
this 465 and all agree). This is the trust-by-demonstration gate from
the direction — satisfied.

**4c — resolver hook:** all three specifier shapes resolve and run in
practice (the corpus uses self `"plgg/index"`, self deep
`"plgg/Functionals/bind"`, and the harness/self-tests use
`"plgg-test/..."`); the full 465-test run could not execute otherwise.
plgg-test's own 68 self-tests also pass (exit 0).

**4d — migration edit-surface:** the import codemod was applied across
all 74 files (0 hand-residual `vitest` imports). The one product-code
edit — the `vi.mock` → `postJson` injection in
`generateObject.spec.ts` (plgg-kit) — was NOT verified here because
this run scoped to `packages/plgg` (plgg-kit needs a dist build).
Flag to route into the plgg-kit smoke. **Action: Constructor should
confirm the injected default still calls the real `postJson`, with a
behavior-parity check, so the one product edit can't mask a change.**

### 5. plgg-kit cross-package smoke — NOT RUN (scoped out)

Requires `scripts/build.sh` (dependency-ordered dist) first because
plgg-kit specs do bare `from "plgg"` → `file:../plgg` dist. Deferred
to keep this validation focused on the headline plgg parity; recommend
running it (with the dist build) before final sign-off, as it is where
the `vi.mock`→`postJson` edit (4d) lives.

---

## Items to route to Constructor (none block the headline parity)

1. **Coverage scope (Amendment 6 verdict needed):** lines-only at `>90`
   vs the prior four-metric `91`. Tighten to four-metric/91 parity OR
   record an explicit named deferral. (Medium — it is the SC5 honesty
   requirement.)
2. **Watch stale module cache on source edits (2b):** source re-runs
   can show old results until restart; bust the ESM cache or document.
   (Low–medium.)
3. **`vi.mock`→`postJson` injection (4d):** verify the real default
   path with a behavior-parity check during the plgg-kit smoke. (Low.)

## Evidence locations (session scratchpad)

- vitest baseline JSON + verdict map; plgg-test verdict dump; file-set
  lists; exit-code/watch/coverage run logs — all under the scratchpad
  dir. Counts quoted above are reproduced from those artifacts.

## Review Notes

(none yet)
