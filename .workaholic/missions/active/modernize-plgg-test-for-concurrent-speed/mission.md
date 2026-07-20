---
type: Mission
title: Modernize plgg-test for concurrent speed
slug: modernize-plgg-test-for-concurrent-speed
status: active
created_at: 2026-07-20T12:21:33+09:00
author: a@qmu.jp
assignee: a@qmu.jp
drive_authorized:
tickets: []
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
---

# Modernize plgg-test for concurrent speed

## Goal

`check-all` is the single most frequently and recurringly executed command in
this repository — every developer runs it before every commit, and every
autonomous drive gates on it. Today its **test-execution phase alone takes
minutes**, because the work is serialized twice over:

1. plgg-test's own runner is **sequential by design** — `Core/Runner.ts` runs
   a suite's tests and child suites through `sequence(...)` with the comment
   "Sequential by design: stubGlobal mutates shared globals, so parallelism
   would race."
2. `check-all.sh` runs the ~32 per-package suites **one after another**, each a
   separate process paying its own startup + typecheck.

Measured 2026-07-20: a full `check-all` was still in its test phase at 5+
minutes. The tests themselves are ~2,150 today (≈3,000 counting `plgg-cms` and
the PoC fleet that main recently retired) and are overwhelmingly fast, pure,
synchronous assertions — the minutes are overhead and serialization, not test
bodies. This taxes the tightest inner loop of development on every single run.

This mission makes the **test-execution phase concurrent by default** and lands
the full suite in **≤10s (20s hard ceiling)**, so the inner loop stops costing
minutes — under two firm constraints: **cross-runtime compatibility** (the
runner must behave identically on Node, Deno, and Bun, so **no Node-only
primitive such as `worker_threads`**), and **zero new dependencies**
(vendor-neutrality — the project's own TypeScript only). Build speed is a
separate concern owned by the plgg-bundle work, explicitly out of scope here.

## Scope

**In scope**

1. **Concurrent-by-default execution** in plgg-test — a runtime-agnostic,
   in-process async scheduler (Promise-based, bounded concurrency) that runs
   independent tests and spec files concurrently, with deterministic,
   correctly-attributed result reporting. No `worker_threads`/`cluster`.
2. **`suite.serial(...)` opt-in serial block** — runs its tests in registration
   order as one indivisible unit, with `beforeEach`/`afterEach` as the fixture
   setup/teardown bracket, isolated from the concurrent pool (the DB-fixture
   case: seed → assert → truncate must not interleave).
3. **Global-stub / DOM-env safety under concurrency** — only 4 packages stub
   process globals (`example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`);
   they must run correctly under the concurrent model with no global bleed.
4. **Concurrent `check-all` fan-out** — the ~32 per-package suites run in
   parallel through the **canonical runner** (no new per-package alias scripts,
   per the command-scripts policy); a failing suite stays unambiguously
   attributed.
5. **A profiling baseline** that pins where the test-phase wall-clock actually
   goes (typecheck vs process startup vs module load vs body vs env install) and
   validates the ≤10s approach **before** the implementation tickets build on
   it.
6. **Cross-runtime proof** — the runner executes green on Node and at least one
   of Deno/Bun.

**Out of scope**

- Build speed / incremental compilation (owned by the modernize-plgg-bundle
  work).
- Any new dependency, and any Node-only concurrency primitive
  (`worker_threads`, `cluster`, native addons).
- Changing the assertion/matcher surface — the pipe-style `check`/matchers and
  the `test`/`suite`/`describe`/`beforeEach`/`afterEach` façade stay.

## Experience

- Running the suite, independent tests and spec files execute **concurrently**;
  a fresh full run across all packages completes in **≤10s (≤20s ceiling)** on
  the dev machine — versus minutes today — and the runner **prints the measured
  wall clock**.
- A `suite.serial("…", () => { … })` block runs its tests strictly in
  registration order, with `beforeEach`/`afterEach` bracketing each as
  setup/teardown, and **does not interleave** with any other test — so a DB
  fixture sequence (seed → assert → truncate) is safe as one unit. Everything
  outside a serial block is concurrent **with no author action**.
- The 4 global-stubbing packages pass with **no global bleed** between
  concurrent tests (a regression test demonstrates two concurrent tests stubbing
  the same global without cross-contamination).
- `check-all` runs the per-package suites in parallel; when one fails, the
  output still names its **package and test** unambiguously.
- The runner behaves **identically under Node, Deno, and Bun** — a green run on a
  second runtime proves no Node-only API crept in.

## Acceptance

- [ ] A profiling baseline documents where today's test-phase wall-clock goes (typecheck vs process startup vs module load vs body vs env install) and validates a runtime-agnostic concurrency approach that can reach ≤10s (#20260720123001-profile-test-phase-validate-concurrency.md)
- [ ] plgg-test executes independent tests and spec files concurrently by default via runtime-agnostic async scheduling with no `worker_threads`; results stay deterministic and correctly attributed (#20260720123002-concurrent-by-default-execution.md)
- [ ] `suite.serial(...)` runs its tests in registration order as one indivisible unit with `beforeEach`/`afterEach` fixture bracketing, isolated from the concurrent pool; documented and tested (#20260720123003-suite-serial-opt-in-block.md)
- [ ] The 4 global-stubbing packages (`example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`) run green under concurrency with no global races; a regression test proves concurrent global-stub isolation (#20260720123004-global-stub-isolation-under-concurrency.md)
- [ ] `check-all` runs the ~32 per-package suites concurrently through the canonical runner with no new per-package alias scripts; a failing suite is still unambiguously attributed (#20260720123005-check-all-concurrent-fanout.md)
- [ ] The concurrent runner executes green on Node and at least one of Deno/Bun, proving no Node-only primitive is used (#20260720123006-cross-runtime-node-deno-bun-proof.md)
- [ ] The full test-execution phase across all packages completes in ≤10s (20s hard ceiling), measured and printed, with a baseline→after comparison recorded in the story (#20260720123007-measure-full-suite-under-10s.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-20 — mission created — 7 kickoff tickets emitted (profiling spike → concurrent runner → suite.serial → global-stub isolation → check-all fan-out → cross-runtime proof → ≤10s measurement); interrogation fixed scope (test-execution only), isolation (in-process async, cross-runtime, no worker_threads), the serial API (suite.serial block), and reach (concurrent runner + concurrent check-all)
