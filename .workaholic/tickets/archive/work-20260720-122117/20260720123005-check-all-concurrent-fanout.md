---
created_at: 2026-07-20T12:30:05+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123009-lean-default-run-inprocess-coverage.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Canonical runner: cross-package process fan-out of the lean test phase

## Overview

**Lever 3 (+4) of the T1-validated order — the lever that converts the lean
phase into the target.** `check-all.sh` enumerates **38 `./scripts/test-*.sh`
lines and runs them strictly one after another**, each a separate process.
After levers 1 and 2 the phase is the lean ~77 s at one test process per
package; fanning that out at ≈core count is what brings it to the ≤35 s target
on this 4-core machine.

T1 also falsified the naive version: `xargs -P4` over the **current** phase
reached only 1.3–1.56×, because each package then spawned three CPU-bound
processes (tsc + coverage-instrumented run + gate fold) and 4 cores
oversubscribed. Fan-out only pays **after** levers 1+2 have cut the phase to one
lean process per package — which is why this ticket depends on them.

Lever 4 is folded in here because it is the same code path: **amortize the
~0.89 s fixed node/module floor** by giving each worker a **batch** of packages
rather than one, so 38 process starts become ≈`nproc` process starts.

## Key files

- `scripts/check-all.sh` — the 38-line sequential test block collapses to one
  invocation of the canonical runner.
- `scripts/runTests.ts` (new) — the canonical runner, alongside the existing
  repo tooling (`publish.ts`, `gateStamp.ts`, `typecheck.ts`). **No new
  per-package alias script** (command-scripts policy).
- `scripts/test-*.sh` — the per-package dev aliases stay for a single-package
  run; `check-all` simply stops enumerating them. They are not deleted and not
  duplicated by the runner.
- `packages/plgg-test/bin/plgg-test.mjs` — the per-package entry the runner
  spawns.
- `scripts/build.sh` — the package topology to derive the list from; do not fork
  it.

## Approach

- The runner takes the package list (derived from the existing topology, not a
  second hand-maintained list), a concurrency limit defaulting to ≈`nproc`
  (overridable by env for measurement), and an optional `--coverage` passthrough.
- **Bounded fan-out with `node:child_process`** — cross-runtime process spawn,
  **never `worker_threads`/`cluster`**. A simple promise pool: N in flight, next
  package starts as one finishes.
- **Buffer each package's stdout/stderr and emit it grouped and attributed**
  (`=== packages/<name> ===` header, then its output, then PASS/FAIL + seconds).
  Never raw-interleave. A failing package must name its package **and** the
  failing test.
- **Batch packages per worker** to amortize the ~0.89 s floor: give each worker a
  slice of the package list to run in sequence, so the floor is paid ≈`nproc`
  times rather than 38. Slice **longest-first** by measured per-package cost so
  the slowest packages start earliest and the workers finish together — a naive
  round-robin leaves one worker holding `plgg-auth`/`plgg`/`plgg-bundle` at the
  end. If running several packages' specs in **one** process proves infeasible
  (per-package alias resolution is cwd-derived in `bin/plgg-test.mjs`), keep one
  process per package **within** the worker's slice and record that in the Final
  Report — the longest-first scheduling is the part that must land either way.
- **Print the measured test-phase wall clock** on every run (the mission's
  Experience demands the number is never stale).
- Preserve `set -e` semantics: any red package fails `check-all` with a non-zero
  exit and a summary listing every failed package.
- `scripts/runTests.spec.ts` covers the pure helpers — package-list derivation,
  the longest-first slicing, output attribution, exit-code folding — under the
  existing `node --test scripts/*.spec.ts` step.

## Quality Gate

- **Acceptance:** `check-all` runs the per-package suites concurrently through
  the canonical runner and prints the test-phase wall clock; a **deliberately
  failing package** still fails `check-all` with unambiguous package + test
  attribution (verify by introducing a real failing assertion and capturing the
  output); output stays legible under concurrency (grouped, never interleaved);
  and the measured phase wall clock is recorded against the 296.5 s baseline
  with the command and raw output in the Final Report.
- **No new per-package alias script**; no `worker_threads`/`cluster`; no new
  dependency; no `as`/`any`/`ts-ignore`; Prettier printWidth 50.
- `check-all` stays **self-verifying**: this ticket changes check-all itself, so
  the deliberate-failure verification is mandatory, not optional.

## Considerations

- **A fast gate that stops failing is a broken gate.** The deliberate-failure
  run is the acceptance, not a nicety — a fan-out that swallows a red package is
  strictly worse than the sequential loop it replaced.
- Contention: 4 cores means the limit is a dial, not a promise. Record the
  measured limit and the wall clock at that limit; do not over-subscribe.
- Keep the coverage-gated path reachable through the **same** runner
  (`--coverage`), so the project's >90% rule has exactly one command and does not
  fragment into a second script.

## Policies

- `workaholic:implementation` — command-scripts consolidation: one canonical
  runner, no bespoke per-package scripts (read the implementation pillar, not
  only operation).
- `workaholic:implementation` / `objective-documentation` — attribution and
  speedup both verified by real runs with captured output.
- `workaholic:design` / `vendor-neutrality` — cross-runtime process spawn only.

## Final Report

`scripts/runTests.ts` (+ `scripts/runTests.spec.ts`) is the canonical runner.
`check-all.sh` lost its 37 enumerated `./scripts/test-<pkg>.sh` lines and the
separate typecheck line; both are now one invocation. The per-package
`test-<pkg>.sh` scripts stay for running a single package by hand — no new
per-package alias script was added.

### Measured — all figures from runs executed in this ticket

```
$ node scripts/runTests.ts                       # tests only, first run (cold cost cache)
test phase: 38 checks in 29.8s (jobs=4) — all green

$ node scripts/runTests.ts --typecheck           # + the whole-repo typecheck gate
jobs=4 → 35.5s   jobs=5 → 33.9s   jobs=6 → 33.8s   jobs=8 → 34.7s

$ ./scripts/check-all.sh                         # end to end
CHECKALL EXIT=0
CHECKALL WALL=115.438122375
test phase: 39 checks in 33.8s (jobs=6) — all green

$ node scripts/runTests.ts --typecheck --coverage
test phase: 39 checks in 61.3s (jobs=6) — all green
```

Against the 228.5 s same-session baseline that is **6.8×**, and it now covers
**38** packages — `plgg-mcp` has 4 specs and a `test` script but was never in
check-all's hand-maintained list. Deriving the set from the filesystem found it.

### Verification that the gate still gates

A real failing assertion added to `plgg-router`:

```
RUNNER EXIT=1  (expect 1)
 FAIL  plgg-router (3.2s)
=== FAILED packages/plgg-router (3.2s) ===
✗ deliberate failure — the fan-out must still go red
test phase: 38 checks in 28.2s (jobs=6) — FAILED in 1: plgg-router
```

Package and failing test both named; the green packages' output is suppressed so
the failure is the only block on screen. And a package whose `test` script drifts
away from the standard invocation is refused rather than run with the wrong
command — `plgg-kit` temporarily set to `vitest run`:

```
DRIFT EXIT=1  (expect 1)
tests: unrecognised test script in: plgg-kit
The canonical runner invokes the plgg-test launcher directly; a package
with a bespoke test command would be run with the wrong one.
```

`node --test scripts/*.spec.ts` → 42 pass / 0 fail; `scripts/tsconfig.json`
typecheck clean.

### The coverage gap from `20260720123009` is closed

`./scripts/check-all.sh --coverage` runs the phase with the four-metric gate;
measured 61.3 s with **all 38 packages passing their thresholds**. Coverage is
opt-in but reachable through the same canonical command — it did not fragment
into a second script.

### Lever 4 (multi-package-per-worker): NOT implemented — measured as not worth it

The ticket allowed either outcome provided the finding was recorded. Two
measurements decided it:

- Bypassing the `bin/plgg-test.mjs` launcher to spawn the CLI directly — the
  cheap half of the idea, removing one process per package — saves **~50 ms**
  (plgg-router 1.22 s via the launcher vs 1.18 s direct, 3 runs each). Not worth
  duplicating the launcher's alias derivation.
- The expensive half — several packages' specs in **one** process — would
  require the resolver's `PLGG_TEST_ALIASES` map and `process.cwd()` to change
  mid-process, and would put two packages' modules in one ESM cache. Isolation
  between packages is a correctness property of the current design; trading it
  for the remaining per-process floor is a bad deal at this size.

What did land from lever 4 is the scheduling half: **slowest job first**, from a
git-ignored `.test-durations.json` written by the previous run (falling back to
spec-file bytes on a cold cache). Without it a worker ends up holding
`plgg-bundle` (11 s) alone at the tail.

### Discovered Insights

- **Insight**: **More children than cores is faster** — jobs=4 → 35.5 s, jobs=6 →
  33.8 s on a 4-core box, with CPU pegged at ~370% either way. **Context**: each
  child spends a real slice of its life starting node and loading its module
  graph, blocked rather than computing, so pinning the pool to `nproc` leaves
  cores idle in those windows. `defaultJobs` is `cores + 2` because of this
  measurement, not by intuition — and past +2 contention costs more than the idle
  it fills.
- **Insight**: Folding the typecheck gate into the **same** pool rather than
  running it before the suites is worth ~6 s (28.5 + 12.7 = 41.2 s sequential vs
  33.8 s overlapped). **Context**: they are independent gates competing for the
  same cores, so running them in series leaves three cores idle for 13 s. It is
  dispatched first because it is the single longest job — as a tail job it would
  cost the whole 13 s back.
- **Insight**: The old hand-maintained list of 37 `test-*.sh` lines had silently
  drifted from reality: `plgg-mcp` shipped 4 specs that **check-all never ran**.
  **Context**: a list a human must remember to update is a list that goes stale;
  deriving the set from "has a `test` script" found the gap immediately. The
  drifted-script refusal is the other half of that — the runner now fails loudly
  rather than assuming every package means the same thing by `test`.
