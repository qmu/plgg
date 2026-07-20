---
created_at: 2026-07-20T12:30:07+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260720123002-concurrent-by-default-execution.md, 20260720123003-suite-serial-opt-in-block.md, 20260720123004-global-stub-isolation-under-concurrency.md, 20260720123005-check-all-concurrent-fanout.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Measure the full test-execution phase at ≤10s

## Overview

The mission's headline measurement. With concurrent execution (T2), serial
blocks (T3), global-stub isolation (T4), and check-all fan-out (T5) in place,
measure the **full test-execution phase across all packages** and confirm it
lands **≤10s (20s hard ceiling)** on the dev machine, down from the minutes
recorded in the T1 baseline. The runner prints the measured wall clock on every
run.

## Key files

- `scripts/check-all.sh` / the canonical runner — print the test-phase wall
  clock.
- The branch story — record the baseline (from T1) → after comparison.

## Approach

- Time a fresh full run of the test phase; confirm ≤10s (≤20s ceiling).
- Have the runner print the number each run so the figure is never stale.
- If it exceeds the ceiling, escalate with the slow-phase breakdown rather than
  faking the number.

## Quality Gate

- **Acceptance:** the measured full test-phase wall clock is **≤10s (≤20s hard
  ceiling)** on the dev machine, printed by the runner, with the baseline→after
  comparison recorded in the story.
- If >20s: escalate (do not tick) with the slow-phase breakdown. No new
  dependency.

## Policies

- `workaholic:implementation` / `objective-documentation` (a real measured wall
  clock, printed, not asserted).
- `workaholic:design` / `vendor-neutrality`.
