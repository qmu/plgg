---
type: Mission
title: Modernize plgg-test for concurrent speed
slug: modernize-plgg-test-for-concurrent-speed
status: active
created_at: 2026-07-20T12:21:33+09:00
author: a@qmu.jp
assignee: a@qmu.jp
drive_authorized: true
strategy: keep-the-plgg-inner-loop-fast-and-its-gates-trustworthy
tickets: []
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
actual_hours: 0.4
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

This mission makes the **test-execution phase fast enough to stop taxing the
inner loop** — under two firm constraints: **cross-runtime compatibility** (the
runner must behave identically on Node, Deno, and Bun, so **no Node-only
primitive such as `worker_threads`**), and **zero new dependencies**
(vendor-neutrality — the project's own TypeScript only). Build speed is a
separate concern owned by the plgg-bundle work, explicitly out of scope here.

## Target — revised from measurement, 2026-07-26

**The original ≤10 s target is retired: it is not reachable on the dev machine,
and this mission says so plainly rather than dropping it silently.** The T1
profiling spike (`20260720123001`, archived) measured the phase at **296.5 s**
and decomposed it:

| Bucket | Share |
|---|---|
| V8 coverage collection + a separate spawned gate-fold process | ~57% |
| Pure test run (native type-strip, no tsc, no coverage) | ~26% |
| 38 cold `tsc --noEmit` programs | ~17% |

**~150 s — half the phase — is per-package process overhead independent of test
count**: ~24 of 38 packages sit at a ~3.9 s floor whatever their spec count,
paying three cold node processes each. Naive per-package process fan-out
(`xargs -P4`) measured only **1.3–1.56×**: the work is CPU-bound and 4 cores
oversubscribe. In-process async concurrency can overlap only the **~3.6 s** of
serial event-loop idle in the per-test rejection flush — it cannot touch the
dominant costs.

**Revised target: ≤35 s, measured on this machine** (4-core, Node v24.13.1).
There is deliberately **no separate CI-host target** — one number, measured
where the developers work. A same-session re-measurement of the current path on
2026-07-26 came in at **228.5 s** (37 packages, all green) under lighter machine
load; both figures are reported so the before/after comparison stays honest.

## Scope

**In scope — ordered by measured leverage** (the three process-level levers
first; the in-process concurrency items are kept but re-prioritized behind them,
because T1 measured their whole budget at ~3.6 s):

0. **A profiling baseline** that pins where the test-phase wall-clock actually
   goes and validates the approach **before** the implementation tickets build
   on it. *(Done — the T1 spike; it is what produced the revised target above.)*
1. **Lever 1 — take `tsc` off the per-package test hot loop** (−~51 s): tests
   already RUN via native type-stripping, so typecheck becomes **one** whole-repo
   gate instead of 38 cold programs.
2. **Lever 2 — coverage opt-in, and the gate folded in-process** (−~168 s from
   the default phase): the default run stops paying V8 coverage instrumentation,
   and the third spawned `gate.ts` process goes away. Coverage enforcement is
   **relocated to a first-class coverage mode of the canonical runner, not
   retired** — the >90% four-metric rule stands.
3. **Lever 3+4 — concurrent `check-all` fan-out through the canonical runner**:
   the per-package suites run in parallel at ≈core count (no new per-package
   alias scripts, per the command-scripts policy), with each worker taking a
   **batch** of packages longest-first so the ~0.89 s per-process floor is paid
   ≈`nproc` times rather than 38. A failing suite stays unambiguously attributed.
4. **Concurrent-by-default execution** in plgg-test — a runtime-agnostic,
   in-process async scheduler (Promise-based, bounded concurrency) that runs
   independent tests and spec files concurrently, with deterministic,
   correctly-attributed result reporting. No `worker_threads`/`cluster`. **Kept
   for the authoring semantics, not for the speed** — its entire measured budget
   is the ~3.6 s of serial event-loop idle.
5. **`suite.serial(...)` opt-in serial block** — runs its tests in registration
   order as one indivisible unit, with `beforeEach`/`afterEach` as the fixture
   setup/teardown bracket, isolated from the concurrent pool (the DB-fixture
   case: seed → assert → truncate must not interleave).
6. **Global-stub / DOM-env safety under concurrency** — only 4 packages stub
   process globals (`example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`);
   they must run correctly under the concurrent model with no global bleed.
7. **Cross-runtime proof** — the runner executes green on Node and at least one
   of Deno/Bun.

**Out of scope**

- Build speed / incremental compilation (owned by the modernize-plgg-bundle
  work).
- Any new dependency, and any Node-only concurrency primitive
  (`worker_threads`, `cluster`, native addons).
- Changing the assertion/matcher surface — the pipe-style `check`/matchers and
  the `test`/`suite`/`describe`/`beforeEach`/`afterEach` façade stay.

## Experience

- A fresh full run of the test phase across all packages completes in **≤35 s on
  the dev machine** — versus the measured 228.5–296.5 s today — and the runner
  **prints the measured wall clock** on every run, so the figure is never stale.
- `npm run test` in a package no longer runs `tsc` and no longer pays coverage
  instrumentation: typecheck is one whole-repo gate, and coverage is a
  first-class **mode** of the same canonical runner that still **fails** a
  package below its threshold.
- Running the suite, independent tests and spec files execute **concurrently**
  in-process, with results deterministic and correctly attributed.
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

- [ ] A profiling baseline documents where today's test-phase wall-clock goes (typecheck vs process startup vs module load vs body vs env install) and validates a runtime-agnostic approach, replacing the pre-measurement guesses (#20260720123001-profile-test-phase-validate-concurrency.md)
- [x] Typecheck comes off the per-package test hot loop: one whole-repo gate replaces 38 cold `tsc --noEmit` programs, a deliberate type error in any package still fails check-all, and the speedup is measured (#20260720123008-whole-repo-typecheck-gate.md)
- [x] The default run is lean — no coverage instrumentation and no spawned gate process — while `--coverage` still folds the gate in-process and still fails a package below its threshold (#20260720123009-lean-default-run-inprocess-coverage.md)
- [x] `check-all` runs the per-package suites concurrently through the canonical runner (no new per-package alias scripts), batching packages per worker longest-first, printing the phase wall clock; a deliberately failing package is still unambiguously attributed (#20260720123005-check-all-concurrent-fanout.md)
- [x] plgg-test executes independent tests and spec files concurrently by default via runtime-agnostic async scheduling with no `worker_threads`; results stay deterministic and correctly attributed (#20260720123002-concurrent-by-default-execution.md)
- [ ] `suite.serial(...)` runs its tests in registration order as one indivisible unit with `beforeEach`/`afterEach` fixture bracketing, isolated from the concurrent pool; documented and tested (#20260720123003-suite-serial-opt-in-block.md)
- [ ] The 4 global-stubbing packages (`example`, `plgg-fetch`, `plgg-view`, `plggmatic-example`) run green under concurrency with no global races; a regression test proves concurrent global-stub isolation (#20260720123004-global-stub-isolation-under-concurrency.md)
- [ ] The concurrent runner executes green on Node and at least one of Deno/Bun, proving no Node-only primitive is used (#20260720123006-cross-runtime-node-deno-bun-proof.md)
- [ ] The full test-execution phase across all packages completes in ≤35 s on the dev machine, measured and printed, with the baseline→after comparison and raw output recorded (#20260720123011-measure-full-test-phase-under-35s.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-20 — mission created — 7 kickoff tickets emitted (profiling spike → concurrent runner → suite.serial → global-stub isolation → check-all fan-out → cross-runtime proof → ≤10s measurement); interrogation fixed scope (test-execution only), isolation (in-process async, cross-runtime, no worker_threads), the serial API (suite.serial block), and reach (concurrent runner + concurrent check-all)
- 2026-07-24 — run recorded (+0.4h) — monitor-20260723-011758
- 2026-07-26 — replanned from T1 measurement — target relaxed to ≤35 s on the dev machine (≤10 s retired as unreachable, no CI-host target); scope re-ordered behind the three process-level levers; T2–T7 reconciled, 123007 superseded, 123008/123009/123011 minted; strategy linked and drive_authorized stamped — 20260720122900-resume-replan-t2-t7-from-t1-findings.md
- 2026-07-26 — ticket archived — 20260720122900-resume-replan-t2-t7-from-t1-findings.md
- 2026-07-26 — ticket archived — 20260720123008-whole-repo-typecheck-gate.md
- 2026-07-26 — ticket archived — 20260720123009-lean-default-run-inprocess-coverage.md
- 2026-07-26 — ticket archived — 20260720123005-check-all-concurrent-fanout.md
- 2026-07-26 — ticket archived — 20260720123002-concurrent-by-default-execution.md
