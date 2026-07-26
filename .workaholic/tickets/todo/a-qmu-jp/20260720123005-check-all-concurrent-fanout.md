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
