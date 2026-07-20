---
created_at: 2026-07-20T12:30:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123001-profile-test-phase-validate-concurrency.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Concurrent-by-default execution in the plgg-test runner

## Overview

Replace the runner's `sequence(...)` scheduling with a **runtime-agnostic,
bounded-concurrency async scheduler** so independent tests and spec files run
concurrently by default. Cross-runtime constraint: Promise-based only — **no
`worker_threads`/`cluster`** — so it behaves identically on Node, Deno, and
Bun. Registration order stops implying execution order (except inside serial
blocks, added in the next ticket), so result collection must stay deterministic
and correctly attributed regardless of completion order.

## Key files

- `packages/plgg-test/src/Core/Runner.ts` — `sequence(...)` → bounded async
  pool; deterministic result tree assembly.
- `packages/plgg-test/src/Core/Registry.ts` — suite/test mode metadata the
  scheduler reads.
- `packages/plgg-test/src/index.ts` — no surface change expected.

## Approach

- Introduce a bounded async pool (limit tunable via an env var, defaulting to a
  sensible core-based value) that schedules leaf tests / spec files as tasks.
- Collect results into the existing suite tree keyed by suite path + name, then
  **sort by registration order at report time** so output is stable even though
  execution is not.
- Preserve `beforeEach`/`afterEach` semantics for each concurrent test.
- Global-stubbing suites fall back to serial until the isolation ticket lands
  (guard so this ticket never races the DOM env).

## Quality Gate

- **Acceptance:** independent tests and spec files run concurrently (observable
  as overlapping execution windows and a measurable wall-clock drop on a
  representative package); results are deterministic and correctly attributed;
  the whole plgg-test self-suite is green; output ordering is stable.
- No `worker_threads`/`cluster`; no new dependency; `scripts/tsc-plgg.sh`
  green; plgg-test coverage stays >90%.

## Policies

- `workaholic:implementation` / machine-checkable + fault-tolerance (a task
  failure is isolated and attributed, never lost).
- `workaholic:design` / `vendor-neutrality` (cross-runtime, project tooling
  only).
- `sacrificial-architecture` — the test framework is durable core; its
  correctness under concurrency is what makes regenerated code trustworthy.
