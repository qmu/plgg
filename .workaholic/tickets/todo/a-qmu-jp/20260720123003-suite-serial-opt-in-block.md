---
created_at: 2026-07-20T12:30:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
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
