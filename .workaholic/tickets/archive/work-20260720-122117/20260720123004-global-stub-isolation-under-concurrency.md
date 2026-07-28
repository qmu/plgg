---
created_at: 2026-07-20T12:30:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260720123003-suite-serial-opt-in-block.md]
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

## Final Report

Two layers, both proven load-bearing by mutation:

1. **Automatic detection** (`Core/scheduling.ts`) — a spec whose source mentions
   `stubGlobal`/`stubEnv` is scheduled **serially by the runner itself**. No
   directive to write, none to forget. Deliberately conservative: a mention in a
   comment or a string counts, because a false positive costs one file's
   concurrency while a false negative is a race that reads green.
2. **A runtime backstop** (`Core/inflight.ts` + the guard in `Mock/vi.ts`) — the
   runner brackets every body with an in-flight count, and a stub attempted
   while siblings are in flight **throws** with a message naming the fix. This
   catches what the source scan cannot see (a stub from a helper module, or
   through an alias).

The hand-written `// @plgg-test-concurrency 1` that ticket `20260720123002` put on
`plgg-fetch`'s spec is **removed** — detection covers it now.

### The ticket's premise was partly wrong, and the correction matters

The ticket says four packages "stub process globals via the DOM env install —
`example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`". Grepping the corpus,
**exactly one** spec calls `vi.stubGlobal`: `plgg-fetch`. The other three use the
DOM environment, which was already auto-serialized by `environmentOf` in the
concurrency ticket. All four are green:

```
plgg-fetch            27 passed, 0 failed, 0 skipped
plgg-view            157 passed, 0 failed, 0 skipped
example               26 passed, 0 failed, 0 skipped
plggmatic-example     56 passed, 0 failed, 0 skipped
```

### The regression test

`fixtures/_stubGlobalFixture.spec.ts` — two tests stub the **same** global with
different values and each **yields to the event loop between stubbing and
reading**, which is precisely the window a concurrent sibling would use to
overwrite it. Both see their own value. It carries **no** directive, so it also
proves the detection is what makes it safe.

**Mutation-checked.** With `stubsGlobals` forced to `false`:

```
--- detection disabled: expect RED (guard must catch it) ---
✗ concurrent global stubs do not bleed between tests
142 passed, 5 failed, 0 skipped
--- and plgg-fetch, which relies on auto-detection ---
18 passed, 9 failed, 0 skipped
--- restored: expect GREEN ---
147 passed, 0 failed, 0 skipped
27 passed, 0 failed, 0 skipped
```

Nine plgg-fetch tests go red rather than silently producing wrong answers — the
backstop working exactly as intended.

Coverage gate green: 95.24 / 86.71 / 92.54 / 95.24, `inflight.ts` **100%**,
`scheduling.ts` 96.36%. Full gate green: `CHECKALL EXIT=0`, `WALL=123.7s`.

### Discovered Insights

- **Insight**: An in-flight counter must be scoped **per file**, not per process.
  Counting globally, a nested run (plgg-test's own `Runner.spec` calling
  `runFile`) shows the enclosing test plus the inner test = 2 in flight, and the
  guard fires on a file that is running perfectly serially. `runFile` now saves
  and restores the count around itself, the same shape as the escape slot.
  **Context**: "how many tests are running" sounds like a process-wide fact and
  is not — it is a question about siblings.
- **Insight**: `plgg-server`'s failure under concurrency is **not** a global-stub
  problem and this ticket does not fix it. It binds real sockets on the loopback
  interface, and a shared OS resource is not something the runner can isolate.
  It keeps its explicit `@plgg-test-concurrency 1` with that reason written down.
  **Context**: worth separating, because "make the global-stubbing packages safe"
  reads as if it covers everything that broke — it does not, and the remaining
  case is not fixable by isolation at all.
