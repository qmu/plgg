---
created_at: 2026-07-20T12:30:01+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: []
mission: modernize-plgg-test-for-concurrent-speed
---

# Profile the test-execution phase and validate the concurrency approach

## Overview

Before touching the runner, measure **where the test-phase wall-clock actually
goes**, so the concurrency work targets the real bottleneck. In-process async
concurrency overlaps I/O and async bodies but does **not** speed up
single-threaded synchronous CPU work — most plgg tests are pure sync
assertions, so if the cost is elsewhere (per-package `tsc --noEmit`, process
startup, module loading, env install), that is what must be attacked. This
ticket produces the evidence and the validated plan the rest of the mission
builds on.

## Key files

- `scripts/check-all.sh` — the sequential per-package suite loop.
- `scripts/test-plgg.sh` and the other `test-*.sh` — each runs
  `tsc --noEmit && plgg-test src` as its own process.
- `packages/plgg-test/src/Core/Runner.ts` — the `sequence(...)` scheduler.
- `packages/plgg-test/src/Env/dom.ts` — the DOM env install / `stubGlobal`.

## Approach

- Instrument a full test-phase run and break the wall-clock down per cost
  bucket: process startup, `tsc --noEmit` typecheck, module import/load, env
  install/teardown, and actual test-body execution.
- Record a baseline number for the full current test phase (all packages).
- Write a validated approach: which layer (in-process async file concurrency,
  cross-package process fan-out, and/or moving `tsc` off the hot test loop)
  buys the ≤10s target, and confirm it needs **no `worker_threads`** and works
  cross-runtime (Node/Deno/Bun).
- A throwaway spike may prove the mechanism on a representative slice; no
  production runner change ships in this ticket.

## Preliminary findings (measured 2026-07-21)

Structural profiling from this session's integration runs (a full `check-all`
on a worktree integrated with current main took **~15 min**):

- **`npm install` is NOT in check-all** — it's a separate `scripts/npm-install.sh`
  that runs **39 sequential per-package `npm install`s** (no root package.json /
  workspaces; all 39 packages cross-link via `file:../`).
- **check-all structure is fully SEQUENTIAL, PER-PACKAGE:** gates →
  `build.sh` (bundles all ~39 packages via plgg-bundle, incl. per-file `.d.ts`
  tsc emit) → ~37–39 test suites, each `tsc --noEmit && plgg-test src` →
  gateStamp.
- **Dominant cost = tsc**, run ~2× per package (build `.d.ts` emit + test
  `--noEmit`), cold each, no incremental/project-refs sharing; plus 39×2 cold
  process startups; plus full sequentiality. **Test bodies are fast** (~3000
  pure sync assertions).
- **Implication for ≤10s:** the win is parallelization + taking `tsc` off the
  test hot-loop (RUN via the runtime's native type-strip; typecheck as a
  separate/incremental gate) — NOT speeding up plgg-test's execution.

## Measured findings (instrumented run, 2026-07-24)

Warm tree (dists + node_modules present), 4-core box (`nproc`=4),
Node v24.13.1, all 38 tested packages green. 617 spec files total.

### Baseline — full test phase (all packages, sequential)

**296.5 s (~4.9 min)** = the sum of every package's `npm run test`
(`tsc --noEmit && plgg-test src`). Per-package spread (seconds): plgg-auth
20.8, plgg 19.9, plgg-bundle 19.3, plgg-cms 19.3, plggmatic 18.9, plggpress
15.1, plgg-test 12.0, plgg-view 11.4, plggmatic-example 10.4, example 10.0,
token-metering 9.9, plgg-cli 8.6, ir-manifest 7.3 — and **~24 of 38 packages
sit at a ~3.9–5.0 s floor regardless of test count** (router 3.9 with 8 specs,
highlight 3.9, kit 3.9, all the pocs ~4.4).

### Wall-clock split by cost bucket

| Bucket | Seconds | Share | Notes |
|---|---|---|---|
| `tsc --noEmit` (38× cold) | **50.9** | 17% | ~0.8–1.5 s cold floor per package (lib.d.ts + @types/node load) even for 1-spec packages; scales for big ones (plgg 2.9, plggmatic 2.4). |
| Pure test RUN (native strip-types, no tsc, no coverage) | **~77** | 26% | The lean run of every package's specs. |
| **V8 coverage collection + separate gate-fold process** | **~168** | **57%** | Largest bucket. `NODE_V8_COVERAGE` collection + a *third* spawned process (`gate.ts`) fold **more than doubles** the run: plgg run-only 4.9 s → run+cov+gate 11–12.5 s; plgg-router 1.5 s → 3.1 s. |

### Per-package fixed floor

Even a 1-spec package pays **~3.9 s** = **three cold node processes** —
`tsc --noEmit` (~1.5 s) + coverage-instrumented run (~1 s) + gate fold
(~0.7 s) + npm. ~24 floor-bound packages ⇒ **~150 s (half the phase) is fixed
per-package overhead independent of test volume.**

### Within a single run (synthetic scaling harness)

- Fixed process/module floor: **~0.89 s**.
- Marginal cost per spec **file**: **~5 ms** (module load / strip-types is
  cheap — 40 files add only ~0.2 s).
- Marginal cost per **test**: **~1.2 ms**, traced to Runner's per-test
  `await new Promise(r => setTimeout(r, 0))` rejection-flush
  (`foldBodyWithRejectionWindow`) — an **idle, strictly-serial event-loop
  turn** per test. ~3000 tests ⇒ **~3.6 s of pure serial idle wait**. This is
  the only cost in-process async concurrency can actually overlap.

### Concurrency mechanism — validated / falsified

- **Naive per-package process fan-out (`xargs -P4`)**: 12-package slice
  86.5 s → 55.3 s = **only 1.56×**; lean run-only 77 s → 58 s ≈ **1.3×**. The
  work is **CPU-bound** (tsc + V8 coverage) and each package already spawns 3
  processes, so 4 cores saturate and oversubscribe. **Fan-out alone cannot
  reach ≤10 s on 4 cores** (ideal 4× of 296 s = 74 s; realistic ~55–60 s).
- **`NODE_COMPILE_CACHE`**: **no measurable gain** (plgg cold 3.4 s vs warm
  3.9 s). Strip-types *compilation* is not the bottleneck — module-graph
  execution + the per-test event-loop flush are.
- **No `worker_threads`** used or needed. Every lever (process fan-out, native
  runtime type-strip run, tsc/coverage off the hot loop) is runtime-agnostic
  (Node/Deno/Bun each ship native TS execution + child processes).

### Validated approach to ≤10 s (ordered by leverage — replans T2–T7)

1. **Take `tsc` off the per-package hot loop (−~51 s).** Tests already RUN via
   native type-strip; make typecheck **one** whole-repo incremental gate
   (`tsc -b` project references) instead of 38 cold programs. Biggest, cleanest
   cut; removes 38 cold process starts.
2. **Make V8 coverage opt-in, not every run (−~168 s from the default phase),
   and fold the gate IN-PROCESS** (drop the 3rd spawned process). Coverage
   belongs in the coverage/CI gate, not the default `test`. After 1+2 the
   default phase ≈ the lean **~77 s**, one process per package.
3. **Cross-package process fan-out** of the lean run at ≈core count →
   contention-limited **~25–35 s** on 4 cores; approaches ≤10 s on an 8–16-core
   CI host.
4. **Close the remainder on modest core counts** by (a) running **multiple
   packages per worker process** to amortize the ~0.89 s node/module floor and
   the shared plgg source graph, and (b) restructuring the runner's per-test
   `setTimeout(0)` flush + shared registry/DOM/`windowStack` so files/tests can
   run with **in-process async concurrency**, overlapping the ~3.6 s of serial
   idle flush. In-process async is a **secondary** lever layered on fan-out — it
   does **not** speed the dominant CPU-bound tsc/coverage/sync-body work.

**Bottom line:** ≤10 s is reached by 1+2 (drop to ~77 s, one lean process per
package) **then** fan-out (3) sized to CI cores, with (4) closing the gap —
**not** by in-process async concurrency alone, which the measurements show
cannot touch the dominant `tsc` (17%) + coverage/gate (57%) + cold-process
costs.

## Quality Gate

- **Acceptance:** a documented breakdown of the test-phase wall-clock by cost
  bucket, a recorded baseline for the full phase, and a written, validated
  mechanism (with expected speedup) that later tickets implement. No production
  runner change beyond a throwaway spike.
- No new dependency; findings are objective/measured, not asserted.

## Policies

- `workaholic:implementation` / `objective-documentation` (the plan is grounded
  in a real measurement, not a guess).
- `workaholic:design` / `vendor-neutrality` (the validated mechanism uses the
  project's own tooling only, cross-runtime, no `worker_threads`).
