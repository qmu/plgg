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

**Still to do in the instrumented run:** exact per-phase seconds (build vs the
two tsc passes vs plgg-test run vs process startup) on a clean current-main
tree, to quantify the split precisely and pin the target of each later ticket.

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
