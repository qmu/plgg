---
created_at: 2026-07-26T10:00:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260720123005-check-all-concurrent-fanout.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Measure the full test-execution phase at ≤35 s on the dev machine

## Overview

The mission's headline measurement. **Supersedes
`20260720123007-measure-full-suite-under-10s.md`**, which was written before T1
measured anything.

**Why the number moved, stated plainly.** T1 measured the phase at **296.5 s**
on this machine (4-core, Node v24.13.1) and decomposed it: ~57% V8 coverage
collection plus a separate gate-fold process, ~17% 38 cold `tsc --noEmit`
programs, and **~150 s of per-package process overhead that is independent of
test count** (~24 of 38 packages sit at a ~3.9 s floor whatever their spec
count). Naive process fan-out measured only **1.3–1.56×**, because the work is
CPU-bound and 4 cores oversubscribe. **≤10 s is not reachable on this dev
machine** and is retired as the target; the developer has relaxed the
acceptance to **≤35 s measured here**, with **no separate CI-host target**.

## Key files

- `scripts/runTests.ts` — the canonical runner; it prints the phase wall clock
  on every run so the figure can never go stale.
- `scripts/check-all.sh` — the phase under measurement.
- The branch story — where the baseline → after comparison is recorded.

## Approach

- Time a **fresh full run** of the test phase through the canonical runner on
  this machine, warm tree, with nothing else contending. Record the exact
  command and its raw output.
- Record a **same-session re-measured baseline** alongside T1's 296.5 s: T1's
  per-package figures were taken under different machine load, so the honest
  comparison is old-path vs new-path measured in the same conditions. Report
  both numbers and say which is which — do not quietly swap one for the other.
- Report the composition of the result (typecheck gate / lean run / fan-out
  limit) so a future regression can be located, not just noticed.
- If the phase exceeds 35 s, **escalate with the breakdown** — do not tick the
  acceptance and do not re-cut the number to fit.

## Quality Gate

- **Acceptance:** the measured full test-phase wall clock is **≤35 s on this
  dev machine** (4-core, Node v24.13.1), printed by the canonical runner, with
  the baseline → after comparison and the raw output recorded. If >35 s:
  escalate with the slow-phase breakdown rather than adjusting the target.
- Every timing claim comes from a run actually executed in this ticket, with its
  command and raw output in the Final Report. No new dependency.

## Considerations

- **The gate must still be a gate.** A phase that is fast because it checks less
  fails this ticket. Confirm alongside the timing that the deliberate-failure
  and deliberate-type-error verifications from the earlier tickets still fail
  `check-all` — the number is only meaningful next to that evidence.
- Machine load is the dominant source of variance here; state the conditions.

## Policies

- `workaholic:implementation` / `objective-documentation` — a real measured wall
  clock, printed, with its command and raw output; never asserted.
- `workaholic:design` / `vendor-neutrality`.

## Final Report

**Target met: 33.6–34.3 s, against ≤35 s.** Measured at `HEAD 5c64c98d`, warm
tree, nothing else contending, Node v24.13.1, `nproc` 4.

```
== node --version: v24.13.1, nproc: 4 ==
== HEAD: 5c64c98d ==

-- test phase, canonical runner, default jobs, 3 runs --
test phase: 39 checks in 34.3s (jobs=6) — all green
test phase: 39 checks in 33.6s (jobs=6) — all green
test phase: 39 checks in 34.0s (jobs=6) — all green

-- test phase WITHOUT the typecheck gate, 1 run --
test phase: 38 checks in 28.6s (jobs=6) — all green

-- coverage-gated phase, 1 run --
test phase: 39 checks in 61.2s (jobs=6) — all green

-- full check-all, wall clock --
CHECKALL EXIT=0
CHECKALL WALL=116.294904385
test phase: 39 checks in 33.9s (jobs=6) — all green
```

### Baseline → after

Both numbers below were measured **in this same session on this same machine**,
by timing each `./scripts/test-*.sh` exactly as `check-all.sh` invoked it:

| | wall clock | packages | contents |
|---|---|---|---|
| **before** | **228.5 s** | 37, all green | per-package `tsc --noEmit` + coverage-instrumented run + spawned gate fold, strictly sequential |
| **after** | **33.9 s** | 38 + the typecheck gate, all green | one whole-repo typecheck gate + one lean process per package, fanned out at 6 |

**6.7×**, on one more package than the old path covered. T1's archived 296.5 s is
reported separately and **not** used as the "before": it was taken under heavier
machine load, and quoting it would have inflated the improvement to 8.7×.

Composition of the 33.9 s: the whole-repo typecheck gate (~29 s of CPU, folded
into the same pool so it overlaps the suites) plus 38 lean package suites. Without
the typecheck gate the suites alone are **28.6 s**.

### The number is only meaningful next to this

A phase that is fast because it checks less would fail this ticket, so both
deliberate-defect probes were re-run at this exact HEAD:

```
--- deliberate FAILING TEST in plgg-router ---
EXIT=1 (expect 1)
 FAIL  plgg-router (3.4s)
✗ deliberate failure
test phase: 39 checks in 33.7s (jobs=6) — FAILED in 1: plgg-router

--- deliberate TYPE ERROR in plgg-kit ---
EXIT=1 (expect 1)
 FAIL  typecheck (29.4s)
test phase: 39 checks in 34.1s (jobs=6) — FAILED in 1: typecheck

--- restored: expect green ---
test phase: 39 checks in 34.1s (jobs=6) — all green
```

### Concern — the margin is thin

34 s against a 35 s ceiling is about **1 s of headroom**, and the run-to-run
spread already spans 0.7 s. Anything that adds load (a background job, another
agent on the box) or a few more packages will push it over. The two levers left,
both measured and both deliberately not taken, are in the archived tickets:
running several packages per worker process (`20260720123005`, rejected because
it would share one ESM module cache between packages) and cutting the typecheck
gate's ~29 s further. Worth a follow-up ticket if the ceiling starts being hit
rather than treating a red measurement as flake.

### Discovered Insights

- **Insight**: The typecheck gate is now the phase's **critical path** at ~29 s
  of the 33.9 s, and the 38 package suites hide almost entirely behind it — the
  suites alone are 28.6 s. **Context**: further speedup has to come from
  typechecking, not from the test runner. That inverts where this mission started
  (the runner's sequential scheduler) and is worth knowing before anyone
  optimizes the runner again for wall clock.
- **Insight**: A measurement taken right after editing sources reads **~42 s**
  rather than ~34 s, because the incremental build info is invalidated for every
  package whose files changed and they are re-checked from scratch. **Context**:
  the acceptance number must be taken on a settled tree, and a one-off high
  reading immediately after a commit is expected rather than a regression.
