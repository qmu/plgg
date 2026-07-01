# Coding Review — Architect (Iteration 1)

Reviewer: Architect (Neutral — translation fidelity & boundary integrity)
Subject: the Iteration-1 deltas in `b9c3492` only (the rest was already
approved in `a4209e5`).
Method: read-only review of the changed files against my prior O1/O2/O3
observations and the per-package Amendment 6 requirement. No tests run.

## Decision

**Approve.** O1 is closed; O2 and O3 are addressed (O2 with a real
implementation, not just a comment softening); no regressions and no new
escape hatches. The remaining items are two cosmetic stale comments.

## O1 — Coverage four-metric, per-package threshold — CLOSED

This is a substantive, correct fix, not a paper one.

- **Four metrics now computed** (`Coverage/v8.ts`): `CoverageReport`
  carries `statements / branches / functions / lines`, each a
  `{covered,total,pct}` `Metric`. `passesThreshold` (lines 435–442)
  requires **every** metric strictly `> threshold` — restoring the
  four-axis gate the old vitest config enforced. The hardcoded single
  line-only `90` is gone.
- **Per-package threshold from config** (`Coverage/config.ts` +
  `gate.ts`): `readConfig` returns `threshold: Option<number>` and
  `gate.ts` uses `matchOption` (exhaustive, house-style) — `none` →
  "reported but UNGATED, exit 0"; `some(n)` → gate all four at `n`.
  Verified the JSON wiring:
  - `packages/plgg/plgg-test.config.json` → `threshold: 91` (the real
    prior number, restored — not 90).
  - `packages/plgg-test/plgg-test.config.json` → `threshold: 85` with
    an explicit `_comment` verdict explaining the branch-metric reality
    (defensive fallback arms; V8 block-branch finer than istanbul). This
    is exactly the Amendment-6 "explicit, recorded ship-or-defer
    verdict," not a silent narrowing.
  - A missing config → `none` → ungated, which is the correct,
    non-re-gating behavior for the three formerly `all:true` packages.
    So migrating them later won't silently impose a default — the gap I
    raised in O1 cannot recur.
- **Never-called-function edge case fixed** (`functionMetric`, lines
  287–304): function coverage is keyed off each V8 function's OUTER
  range `count`, so an uncalled top-level function counts against the
  function metric. And because `coveredOutputLines` (lines 370–401)
  resolves each line to its INNERMOST range, that uncalled function's
  lines fall in a count-0 range and are NOT scored as line-covered. Both
  halves of the edge case are handled. The synthetic empty-name module
  wrapper is correctly excluded so it neither inflates nor deflates.

One honest nuance, correctly documented (not a defect): `statements`
mirrors `lines` because V8 is range/block-based, not statement-AST-based
(`v8.ts` header lines 29–34, per design §1.8). The gate is the contract,
not byte-identical vitest numbers — consistent with what the team
accepted. A single `threshold` number applied to all four matches the
old config, which used four identical `91`s.

## O2 — Unhandled-rejection window — IMPLEMENTED (not just softened)

`Runner.ts` now runs each test body inside a real rejection-capture
window (`guardWithRejectionWindow`, with `windowStack` + a single lazily
installed `process.on("unhandledRejection")` listener). A fire-and-
forget promise that rejects after the body resolves now fails its test
instead of escaping. Three things I checked and they're right:
- **Nested-run attribution:** the window STACK routes each event to the
  innermost active window only, so plgg-test's own `Runner.spec` (a test
  that itself calls `runFile`) won't double-fail overlapping tests.
- **Flush before judging:** `await new Promise(r => setTimeout(r,0))`
  drains the macrotask queue so a not-awaited rejection is delivered
  before the verdict — without this the window would race the verdict.
- **Precedence:** awaited/thrown failure first, then escaped rejection,
  then teardown — matches the documented contract. A
  `fixtures/_unhandledFixture.spec.ts` was added to exercise it.

This is the stronger of the two options I offered (install the window vs.
soften the comment); the comment now matches the actual guarantee.

## O3 — Deep-equal cycle caveat — ADDED

`equals.ts` header now states the acyclic assumption explicitly
(no visited-set guard; a cyclic value would overflow the stack; out of
scope because the corpus compares only acyclic Datum/Dict/Result trees;
add a visited-pair set if cyclic data is ever introduced). Exactly the
one-line caveat requested.

## Watch fresh-process — STRUCTURALLY SOUND

The pivot from an in-process `Watch/watch.ts` (now deleted; `cli.ts`
reduced to a single run) to a re-exec-per-change child in the bin
launcher is correct, and it actually fixes a latent staleness bug:
- **Clean module graph per run:** an in-process re-run reused Node's
  ESM module cache for the imported source-under-test (the spec
  cache-bust only re-evaluates spec *bodies*, not their imports), so a
  SOURCE edit would have reported stale results. A fresh child reloads
  everything — source edits now reflect. This is the right call and is
  consistent with the coverage re-exec pattern (same `nodeFlags`, same
  alias env).
- **Loop survives red runs:** in watch mode `runChild()` is called
  WITHOUT `process.exit()` (lines 164, 179), so a failing run prints its
  verdict and the watcher keeps going — the loop-doesn't-die requirement
  holds.
- **Debounce + coalescing:** 100 ms `clearTimeout`/`setTimeout` debounce,
  plus a `running`/`pending` guard so changes during a run trigger
  exactly one follow-up. `spawnSync` is blocking, so runs never overlap.
  Sound.

## No new escape hatches — CONFIRMED

Re-grepped the Iteration-1-touched files (`config.ts`, `v8.ts`,
`gate.ts`, `Runner.ts`, `cli.ts`, `bin/plgg-test.mjs`) for
`as`/`:any`/`<any>`/`@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`. The
only hit is `watch as fsWatch` — an import rename, not a type cast. The
new `config.ts` JSON parsing is escape-hatch-free: it narrows `unknown`
via `typeof`/`in` guards and an `atObj` that reads through
`new Map(Object.entries())` rather than casting; `stringArrayAt` uses an
`e is string` type predicate. Clean, house-style.

## Minor (cosmetic, non-blocking)

- `bin/plgg-test.mjs` header (lines 12–16) still says "applies the >90%
  gate" — stale; it's now the per-package gate. One-line comment fix.
- `Coverage/v8.ts` `keep` re-derives the spec/test exclusion inline; the
  `config.exclude` list is also applied. No bug (both correct), just two
  places encoding "not a spec file" — fine to leave.

## Verdict

O1 closed; O2/O3 done; watch fresh-process sound; boundary still intact
(only runtime dep is `plgg`; `matchOption`/`Option`/`some`/`none` from
plgg are used in the new config code — good dogfooding). Approve.
