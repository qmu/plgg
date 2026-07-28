---
created_at: 2026-07-20T12:30:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123005-check-all-concurrent-fanout.md]
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

**Re-prioritized after the T1 measurement — read this before estimating its
value.** T1 measured the in-process serial cost precisely: the per-test
`await new Promise(r => setTimeout(r, 0))` rejection flush in
`foldBodyWithRejectionWindow` is an **idle, strictly-serial event-loop turn**
costing ~1.2 ms × ~3000 tests = **~3.6 s of pure serial idle** across the whole
repo. That ~3.6 s is the **entire** budget in-process async concurrency can
recover: the dominant costs are CPU-bound (typecheck, coverage instrumentation,
synchronous assertion bodies) and are addressed by the three process-level
levers this ticket now depends on.

So this ticket is kept **for the authoring semantics, not for the speed** — it
is what makes `suite.serial` meaningful and what lets a genuinely async suite
overlap its I/O. Do not justify it with a wall-clock claim it cannot deliver,
and do not let it block the levers that can.

## Key files

- `packages/plgg-test/src/Core/Runner.ts` — `sequence(...)` → bounded async
  pool; deterministic result tree assembly; the per-test `setTimeout(0)`
  rejection-flush window and the `windowStack` that attributes escaped
  rejections (both assume strict serial nesting today).
- `packages/plgg-test/src/Core/Registry.ts` — suite/test mode metadata the
  scheduler reads; `resetRegistry`/`takeRootSuite` are process-global, so
  concurrent spec files currently cannot register at the same time.
- `packages/plgg-test/src/Cli/cli.ts` — the file-level `sequence(...)` over
  discovered spec files.
- `packages/plgg-test/src/index.ts` — no surface change expected.

## Approach

- Introduce a bounded async pool (limit tunable via an env var, defaulting to a
  sensible value) that schedules leaf tests / spec files as tasks.
- Collect results into the existing suite tree keyed by suite path + name, then
  **sort by registration order at report time** so output is stable even though
  execution is not.
- Preserve `beforeEach`/`afterEach` semantics for each concurrent test.
- **The `windowStack` rejection-attribution model is the hard part.** It is a
  stack today precisely because runs nest strictly; under concurrency several
  windows are open at once and a single process listener cannot route an escaped
  rejection to "the innermost" one. Either scope the window per running test
  (not a stack) or serialize the flush; whichever is chosen, plgg-test's own
  `Runner.spec` coverage of nested runs must stay green.
- **The module-global registry is the second hard part.** `runFile` calls
  `resetRegistry()` then imports the spec; two spec files loading concurrently
  would interleave their registrations. Either keep file-level loading serial
  and parallelize only *within* a file, or give registration a per-file scope.
- Global-stubbing suites fall back to serial until the isolation ticket lands
  (guard so this ticket never races the DOM env).

## Quality Gate

- **Acceptance:** independent tests and spec files run concurrently (observable
  as overlapping execution windows); results are deterministic and correctly
  attributed regardless of completion order; the whole plgg-test self-suite is
  green; output ordering is stable across repeated runs. Report the measured
  wall-clock delta **honestly against the ~3.6 s serial-idle budget** — a small
  number is the expected outcome, not a failure of this ticket.
- No `worker_threads`/`cluster`; no new dependency; no `as`/`any`/`ts-ignore`;
  `scripts/tsc-plgg.sh` green; plgg-test coverage stays above its configured
  threshold; Prettier printWidth 50.

## Considerations

- **Determinism is the acceptance; speed is not.** A concurrent runner that
  reports a flaky or misattributed result is a net loss however fast it is.
- The whole repo's ~3000 tests run through this scheduler, so a regression here
  is a regression in every package's gate — verify by running the full phase,
  not only plgg-test's own suite.

## Policies

- `workaholic:implementation` / machine-checkable + fault-tolerance (a task
  failure is isolated and attributed, never lost).
- `workaholic:design` / `vendor-neutrality` (cross-runtime, project tooling
  only).
- `sacrificial-architecture` — the test framework is durable core; its
  correctness under concurrency is what makes regenerated code trustworthy.

## Final Report

`Core/Runner.ts` schedules a suite's tests and child suites through a bounded
async pool (`PLGG_TEST_CONCURRENCY`, default 4). Results are collected **by
index**, so the report is registration-ordered however execution interleaves.
Spec **files** stay one at a time — registration is process-global.

### Measured — concurrency in isolation, 3 runs each

| package | serial | concurrent (4) | delta |
|---|---|---|---|
| `plgg` | 2.720s | 2.318s | −0.40s (15%) |
| `plggmatic` | 2.666s | 2.402s | −0.27s (10%) |
| `plgg-cms` | 5.220s | 3.844s | **−1.38s (26%)** |

Across the whole repo through the canonical runner it is worth **nothing**:
28.5 s before this ticket, 28.5 s after (38 packages, all green). Exactly the
outcome the replan predicted — the six-way process fan-out already pegs the CPU
at ~370%, so recovering per-test event-loop idle inside a process has no wall
clock left to give back. The per-package numbers above are the real payoff, and
they land on `scripts/test-<pkg>.sh`, the single-package inner loop.

Full gate green: `CHECKALL EXIT=0`, `WALL=115.6s`,
`test phase: 39 checks in 34.0s (jobs=6) — all green`. plgg-test's own suite
**140 passed, 0 failed** (was 135); its coverage gate green at
95.30 / 87.04 / 92.20 / 95.30 with `Runner.ts` at 96.36%.

### The design conflict this ticket hit, and how it was resolved

**Exact per-test attribution of an unhandled rejection is not achievable under
concurrency without `async_hooks`** — which is Node-only and therefore banned by
the mission's cross-runtime constraint. The old `windowStack` worked only because
runs nested strictly; concurrently several windows are open and "the innermost"
is decided by timing.

Resolution, deterministic in both modes, and the anti-false-green property
(guardrail O2) intact in both:

- **serial** — exact per-test blame, unchanged.
- **concurrent** — the **file** goes red with one synthetic result carrying every
  escaped reason and the instruction to re-run with `PLGG_TEST_CONCURRENCY=1`.

Both are now pinned by their own spec. The alternative — blaming whichever window
happened to be innermost — would have made the same run accuse a different test
each time, which is worse than an honest file-level failure.

### Verified

```
concurrent: {"passed":2,"failed":1}   # file-level, still red
  passes synchronously = passed
  starts a fire-and-forget rejection = passed
  fixtures/_unhandledFixture.spec.ts = failed
serial:     {"passed":1,"failed":1}   # exact per-test blame
  starts a fire-and-forget rejection = failed
```

Plus a determinism spec: the same file run twice concurrently, and once
serially, produces identical result ordering.

### Discovered Insights

- **Insight**: A whole-`runFile` mutex **deadlocks**. The obvious fix for the
  process-global registry — serialize entire `runFile` calls — hangs the moment a
  test calls `runFile` itself (plgg-test's own `Runner.spec`): the inner call
  waits on the gate the outer call is still holding, and Node exits 0 with **no
  output at all**, because the runner's own `unhandledRejection` listener
  swallows the failure. **Context**: two traps in one. A silent exit-0 with no
  report is what a deadlock looks like here, and installing an
  `unhandledRejection` listener means the process no longer crashes on its own
  bugs. The fix was a per-file opt-out directive (`// @plgg-test-concurrency 1`)
  rather than a lock.
- **Insight**: `environmentOf()` returns **`undefined`** for a plain spec, not
  `"node"`. Guarding with `environment === "node"` silently made *every* file
  serial — the change appeared to work (all tests green) while doing nothing at
  all. **Context**: a concurrency flag that is silently never on is the worst
  failure mode of this kind of work; only measuring a behaviour difference
  (serial vs concurrent attribution) caught it, not the test suite.
- **Insight**: Turning concurrency on found **two real serial assumptions** in the
  corpus that nothing else would have: `plgg-fetch` replaces the process-global
  `fetch` via `vi.stubGlobal` and restores it in `afterEach` (one test tears down
  the stub another is still using), and `plgg-server` binds **real sockets** on
  the loopback interface (contending for ports, surfacing as `fetch failed`
  rather than as an assertion). **Context**: the second is not a
  global-stub problem and will not be fixed by the isolation ticket — a shared OS
  resource is not something the runner can isolate, so that suite stays serial by
  declaration. Both now carry the directive with the reason written down.
- **Insight**: The `_hooksFixture` asserts a shared log **across** tests
  ("second test sees prior after then before"). That is a statement about
  execution order between tests, which concurrency deletes by design — hooks
  still bracket each test. It is the clearest small example of what
  `suite.serial` is for, and it now says so in the fixture.
