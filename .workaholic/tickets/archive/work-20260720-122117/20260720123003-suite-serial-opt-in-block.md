---
created_at: 2026-07-20T12:30:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Added
depends_on: [20260720123002-concurrent-by-default-execution.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Add `suite.serial(...)` opt-in serial block

## Overview

Add `suite.serial(...)` (with a `describe.serial` alias) that runs its tests in
**registration order as one indivisible unit** — never interleaved with the
concurrent pool — using `beforeEach`/`afterEach` as the fixture setup/teardown
bracket. This is the sanctioned way to write shared-state sequences (the
DB-fixture case: seed → assert → truncate). It follows the existing modifier
idiom (`Object.assign(fn, { skip })` in `Registry.ts`), so `suite.serial` sits
beside `suite.skip`.

## Key files

- `packages/plgg-test/src/Core/Registry.ts` — `suite.serial` / `describe.serial`
  registration (mode `"serial"`).
- `packages/plgg-test/src/Core/Runner.ts` — a serial suite is scheduled as a
  single atomic task whose internal tests run in order.
- `packages/plgg-test/src/index.ts` + `packages/plgg-test/README.md` — export
  and document with the DB example.

## Approach

- Mark the suite `mode: "serial"`; the scheduler treats it as one task,
  removing its children from the concurrent pool and running them sequentially
  with hook bracketing.
- Document the exact DB-fixture example from the mission interrogation.

## Quality Gate

- **Acceptance:** a `suite.serial` block runs its tests strictly in
  registration order as one unit with `beforeEach`/`afterEach` bracketing, and
  a test proves it does **not interleave** with concurrent tests; documented in
  `packages/plgg-test/README.md` with the DB-fixture example.
- No new dependency; `scripts/tsc-plgg.sh` green; plgg-test coverage stays
  >90%.

## Policies

- `workaholic:implementation` / `objective-documentation` (non-interleave is
  demonstrated by a test, not asserted).
- `workaholic:design` / `vendor-neutrality`.
- `dont-clone-garbage` — reuse the established `.skip`-style modifier shape, do
  not invent a parallel mechanism.

## Final Report

`suite.serial(name, fn)` (and `describe.serial`, the same function via the
alias) registers a suite with the new `SuiteMode` value `"serial"`, following the
existing `Object.assign(fn, { skip })` shape — it sits beside `suite.skip`, no
parallel mechanism.

The scheduler runs a serial block as **one indivisible unit**: its own tests at a
limit of 1, its descendants likewise, and — the part that matters — in its **own
scheduling phase** with nothing else in flight. Handing the child a limit of 1
while its concurrent siblings keep running beside it would have satisfied
"in registration order" while failing "does not interleave", so children are
grouped instead: consecutive concurrent suites coalesce into one pooled batch,
and each serial block stands alone.

**Registration position is preserved.** Grouping is over *consecutive* children,
not a global partition by mode — a global partition would have silently moved
every serial block to one end of the file, which is exactly the reordering an
author reaches for `.serial` to prevent.

### Verified — the fixture proves it from inside the scheduler

`fixtures/_serialFixture.spec.ts` marks each body's start, yields to the event
loop, then marks its end, so an interleave appears in the log as a foreign entry
between a test's own start and end. It then asserts the log from a trailing
serial `verdict` block:

```
concurrent block:  c1-start, c2-start, c2-end, c1-end   ← overlapped, and
                                                          finished OUT of
                                                          registration order
serial block:      s1-start, s1-end, s2-start, s2-end   ← never interleaved
                   log.length === 8                     ← nothing else got in
```

`Runner.spec` checks all six of its tests pass **and** that the reported order is
still registration order.

**The fixture is not vacuous** — downgrading `suite.serial("serial block", …)` to
plain `suite(…)` turns it red, and restoring it turns it green:

```
--- serial block downgraded to a plain suite: expect RED ---
✗ suite.serial runs as one indivisible unit while siblings overlap
141 passed, 1 failed, 0 skipped
--- restored: expect GREEN ---
142 passed, 0 failed, 0 skipped
```

Documented in `packages/plgg-test/README.md` with the DB-fixture example
(seed → assert → truncate) from the mission interrogation.

plgg-test coverage gate green — 95.16 / 86.77 / 92.35 / 95.16, `Registry.ts` at
**100%**, `Runner.ts` at 95.38%. Full gate green: `CHECKALL EXIT=0`,
`WALL=123.9s`.

### Discovered Insights

- **Insight**: "Runs in registration order" and "does not interleave" are two
  different guarantees, and the cheap implementation delivers only the first.
  Passing a serial child a concurrency limit of 1 orders its own tests while
  leaving its concurrent siblings running alongside it — a DB fixture would still
  see another test's writes. The guarantee has to be a **scheduling phase**, not
  a parameter. **Context**: this is the trap to remember if the scheduler is ever
  rewritten; the fixture's `log.length === 8` assertion is what catches it.
- **Insight**: The check-all run right after editing runner sources measured the
  typecheck job at **42.3 s** rather than its usual ~13 s, making it the phase's
  critical path. **Context**: the incremental build info was invalidated for every
  package whose sources changed, so they were re-checked from scratch. Any timing
  measurement taken immediately after a source edit is a cold-ish number — the
  ≤35 s acceptance has to be measured on a settled tree, and this is why.
