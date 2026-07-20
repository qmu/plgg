---
created_at: 2026-07-20T12:30:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123002-concurrent-by-default-execution.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Make global-stubbing packages safe under concurrency

## Overview

Only 4 packages stub process globals via the DOM env install — `example`,
`plgg-fetch`, `plgg-view`, `plggmatic-example`. Under concurrency, two tests
mutating the same global would race (the very reason the runner was sequential).
Per the T1 findings, make these safe: either **auto-serialize** any suite that
installs the DOM env / `stubGlobal` (reusing the serial machinery from the
`suite.serial` ticket), or **isolate** the stubbed global per test — whichever
the profiling spike validated as cross-runtime.

## Key files

- `packages/plgg-test/src/Env/dom.ts` — the env install / `stubGlobal` and its
  teardown.
- `packages/plgg-test/src/Core/Runner.ts` — where env-installing suites get the
  serial/isolation constraint.
- Specs in `example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`.

## Approach

- Detect env-installing suites and schedule them under a shared serial
  constraint (internal lock) so their global mutations never overlap, OR scope
  the stub per test if the spike proved that path viable cross-runtime.
- Add a regression test: two concurrent tests stubbing the same global observe
  no cross-contamination.
- Run all 4 consumer packages green under the concurrent runner.

## Quality Gate

- **Acceptance:** all 4 global-stubbing packages run green under the concurrent
  runner; a regression test demonstrates concurrent global-stub isolation (no
  bleed between concurrent tests).
- No `worker_threads`; no new dependency; `scripts/tsc-plgg.sh` green; coverage
  stays >90%.

## Policies

- `workaholic:implementation` / fault-tolerance + machine-checkable (isolation
  proven by a regression test).
- `workaholic:design` / `vendor-neutrality`.
