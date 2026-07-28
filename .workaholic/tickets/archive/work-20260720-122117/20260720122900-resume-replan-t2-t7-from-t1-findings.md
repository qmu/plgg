---
created_at: 2026-07-25T00:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: []
mission: modernize-plgg-test-for-concurrent-speed
---

# RESUME — replan T2–T7 from the T1 profiling findings

**Read this first.** This is a `/carry` resumption checkpoint written
2026-07-25. The T1 profiling spike is DONE and archived (commit
`fee27457`, branch `work-20260720-122117`; not yet PR'd). The mission is
deliberately **NOT `drive_authorized`** — T1 was the spike that gates the
rest. Before driving T2–T7, **reconcile those existing tickets
(`20260720123002`–`123007`, written before the measurement) against the
data below**, then re-`drive_authorize` the mission. This ticket
implements nothing.

## The measured data (instrumented run 2026-07-24, warm tree, 4-core, Node v24.13.1)

Full test phase baseline (all 38 packages, sequential): **296.5 s (~4.9 min)**.

Wall-clock split by cost bucket:

| Bucket | Seconds | Share |
|---|---|---|
| **V8 coverage collection + separate gate-fold process** | **~168** | **57%** |
| Pure test RUN (native strip-types, no tsc, no coverage) | ~77 | 26% |
| `tsc --noEmit` (38× cold) | ~51 | 17% |

- **~24 of 38 packages sit at a ~3.9 s fixed floor regardless of test
  count** = three cold node processes each (tsc + coverage-run + gate
  fold). ⇒ **~150 s (half the phase) is per-package overhead independent
  of test volume.**
- Naive per-package process fan-out (`xargs -P4`) reached only
  **1.3–1.56×** — the work is CPU-bound (tsc + V8 coverage) and each
  package already spawns 3 processes, so 4 cores oversubscribe.
  **Fan-out alone cannot reach ≤10 s on 4 cores.**
- `NODE_COMPILE_CACHE`: no measurable gain. **No `worker_threads` needed
  or used**; every lever is runtime-agnostic (Node/Deno/Bun ship native
  TS execution + child processes).
- Per-test marginal cost ~1.2 ms is an idle serial event-loop flush
  (`foldBodyWithRejectionWindow`) — ~3.6 s of pure serial idle over
  ~3000 tests; the only thing in-process async concurrency can overlap.

Full detail: the archived T1 ticket
`.workaholic/tickets/archive/work-20260720-122117/20260720123001-profile-test-phase-validate-concurrency.md`.

## Validated approach — reshape T2–T7 to THIS order of leverage

1. **Take `tsc` off the per-package hot loop (−~51 s).** Tests already RUN
   via native type-strip; make typecheck ONE whole-repo incremental gate
   (`tsc -b` project references) instead of 38 cold programs.
2. **Coverage opt-in, not every run, and fold the gate IN-PROCESS
   (−~168 s from the default phase).** Drop the 3rd spawned `gate.ts`
   process; coverage belongs in the coverage/CI gate, not default `test`.
   After 1+2 the default phase ≈ the lean **~77 s**, one process/package.
3. **Cross-package process fan-out** of the lean run at ≈core count →
   contention-limited **~25–35 s** on 4 cores; approaches ≤10 s on an
   8–16-core CI host.
4. **Amortize the ~0.89 s per-process floor** by running **multiple
   packages per worker process** on modest core counts.

Keep the mission's hard constraints: **no `worker_threads`** (cross-runtime
Node/Deno/Bun), `suite.serial` opt-in, ≤10 s full-suite target.

## Next actions for a fresh session

- Reconcile/rewrite `20260720123002`–`123007` so each maps to a step
  above (esp. 123002 concurrent-by-default, 123005 check-all fan-out,
  123007 measure ≤10 s), then `drive_authorize` the mission.
- Then a normal `/drive` (or `/monitor`) drains T2–T7.
- Consider a PR for the T1 findings (branch `work-20260720-122117`,
  commit `fee27457`) so the measurement is reviewable.

## Quality Gate

- Satisfied when T2–T7 have been reconciled with the findings above and
  the mission is re-`drive_authorized`. Archive this resume ticket then.

## Policies

- `workaholic:implementation` / `objective-documentation` — a verifiable,
  machine-actionable recovery checkpoint carrying the measured data.
- `workaholic:implementation` / `operational-planning` — replan the
  concretization from evidence, not from the pre-measurement guesses.

## Final Report

Replan completed. The developer's two rulings were applied as given and not
re-opened: the target is **≤35 s measured on this machine** with **no separate
CI-host target**, and the in-process concurrency items stay in scope but sit
**behind** the three process-level levers.

**Tickets reconciled against the validated order of leverage**

| Ticket | Disposition |
|---|---|
| `20260720123008-whole-repo-typecheck-gate.md` | **minted** — lever 1 (had no ticket) |
| `20260720123009-lean-default-run-inprocess-coverage.md` | **minted** — lever 2 (had no ticket) |
| `20260720123005-check-all-concurrent-fanout.md` | **rewritten** — levers 3+4, now depends on 123009 |
| `20260720123002-concurrent-by-default-execution.md` | **rewritten** — deprioritized behind 123005, honest ~3.6 s budget stated |
| `20260720123003`, `20260720123004`, `20260720123006` | **re-ordered** (`depends_on` relinked into a single chain) |
| `20260720123007-measure-full-suite-under-10s.md` | **superseded** by `20260720123011-measure-full-test-phase-under-35s.md` |

Levers 3 and 4 are deliberately one ticket: batching packages per worker is the
same code path as the fan-out, and splitting them would have produced two
half-built runners.

### Discovered Insights

- **Insight**: A same-session re-measurement of the *current* test phase came in
  at **228.5 s**, not T1's 296.5 s — 37 packages, all green, warm tree, measured
  by timing each `./scripts/test-*.sh` exactly as `check-all.sh` invokes them.
  **Context**: T1's absolute numbers were taken under heavier machine load, so
  the per-package figures in the archived spike are not directly comparable to a
  fresh run. Its *proportions* (57% coverage+gate / 26% run / 17% tsc) and its
  falsifications (fan-out at 1.3–1.56×, `NODE_COMPILE_CACHE` no gain) are what
  carry forward. Any before/after claim must re-measure the old path in the same
  session rather than quoting 296.5 s as the "before".
- **Insight**: The repo's 39 packages carry **12 distinct tsconfig shapes** —
  DOM vs node-only `lib`, `NodeNext` vs `ESNext`, and `paths` self-aliases like
  `plgg/*` → `./src/*`. **Context**: this rules out the obvious implementation of
  "one whole-repo typecheck" (a single merged program), because a node-only
  package would then see `DOM` and silently check *less*. Lever 1 must keep one
  program per package and share the *host*, not the options — recorded in
  `20260720123008` so a future implementer does not rediscover it the expensive
  way.
- **Insight**: Stamping `drive_authorized: true` now requires a `strategy:` link
  (`hooks/validate-mission.sh`), and this repository had **no strategies at all**
  — the requirement postdates every mission here. **Context**: the stamp is
  blocked at write time until a strategy exists, so
  `keep-the-plgg-inner-loop-fast-and-its-gates-trustworthy` was created and
  linked. The other active missions are unaffected (the hook only fires on
  `drive_authorized: true`), so this does not oblige the repo to backfill
  strategies — but the next mission to be authorized will hit the same gate.
