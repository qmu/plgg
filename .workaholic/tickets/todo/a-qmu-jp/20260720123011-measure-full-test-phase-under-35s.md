---
created_at: 2026-07-26T10:00:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 2h
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
