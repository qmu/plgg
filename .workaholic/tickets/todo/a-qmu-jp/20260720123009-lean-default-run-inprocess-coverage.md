---
created_at: 2026-07-26T10:00:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260720123008-whole-repo-typecheck-gate.md]
mission: modernize-plgg-test-for-concurrent-speed
---

# Lean default run: coverage opt-in and the gate folded in-process

## Overview

**Lever 2 of the T1-validated order — the single largest bucket (~168 s of
296.5 s, 57%).** `bin/plgg-test.mjs` gates coverage **unconditionally** (D14):
every run re-execs the CLI under `NODE_V8_COVERAGE` and then spawns a **third**
process (`Coverage/gate.ts`) to fold the dump. Measured, this **more than
doubles** each package's run — `plgg` 4.9 s run-only → 11–12.5 s with
coverage+gate; `plgg-router` 1.5 s → 3.1 s.

Two changes, both from the T1 findings:

1. **Coverage becomes opt-in.** The default run — the developer's inner loop —
   executes the specs and nothing else. Coverage instrumentation belongs in the
   coverage gate, not in every `npm run test`.
2. **The gate folds in-process.** Even under `--coverage`, the third spawned
   process goes away: the CLI child flushes V8 coverage itself
   (`node:v8`'s `takeCoverage()`) and folds the gate in the same process,
   removing ~0.7 s × 38 of pure process start.

After levers 1+2 the default phase is the lean **~77 s** measured in T1, at one
test process per package.

## Key files

- `packages/plgg-test/bin/plgg-test.mjs` — `runChild()`: today always sets
  `NODE_V8_COVERAGE` and always spawns `gate.ts`. Becomes: plain run by default;
  under `--coverage`, run with `NODE_V8_COVERAGE` and let the child fold.
- `packages/plgg-test/src/Cli/cli.ts` — after the run, when coverage is on,
  flush and fold in-process instead of leaving it to a spawned process.
- `packages/plgg-test/src/Coverage/gate.ts` — split: the **entry** (argv +
  `process.exitCode`) stays thin, the **fold-and-report** becomes an exported
  function the CLI can call directly. Do not duplicate the logic — extract it.
- `packages/plgg-test/src/Coverage/v8.ts`, `config.ts` — unchanged fold and
  per-package threshold config; the >90% rule and per-package `exempt` markers
  keep their exact current meaning.
- `packages/plgg-test/README.md` — document that `test` is lean and `coverage`
  is the gated mode.

## Approach

- `--coverage` (already accepted and currently ignored) becomes the real switch.
  Default: one `spawnSync` of the CLI, no `NODE_V8_COVERAGE`, no gate process.
- Under `--coverage`: keep `NODE_V8_COVERAGE` pointing at the temp dir, and have
  the CLI call `v8.takeCoverage()` after the run to flush the dump, then invoke
  the extracted fold-and-gate function on that directory. `NODE_V8_COVERAGE` is
  a Node-specific coverage facility and always was; the **runner** stays
  runtime-agnostic, which is what the mission constraint governs.
- Keep `Coverage/gate.ts` working as a standalone entry (it is coverage-excluded
  today and stays so) so nothing that shells out to it breaks.
- Wire the modes end to end: `npm run test` → lean; `npm run coverage` → gated.
  `scripts/check-all.sh` keeps a **coverage-gated** path (see the canonical
  runner ticket) so the project's >90% rule is still enforced by a single
  documented command — it just stops being paid on every inner-loop run.

## Quality Gate

- **Acceptance:** the default run spawns **no** coverage-collection re-exec and
  **no** `gate.ts` process (verify by observing the process tree / the absence of
  the coverage temp dir); `--coverage` still prints the same four metrics and
  still **fails** a package below its configured threshold (verify by
  temporarily lowering a package's covered surface or raising its threshold);
  the per-package before/after wall clock is recorded for at least `plgg` and one
  floor-bound package, with the commands and raw output in the Final Report.
- plgg-test's own suite green; plgg-test coverage stays above its configured
  threshold; `scripts/tsc-plgg.sh` clean.
- No `as` / `any` / `ts-ignore`; no new dependency; Prettier printWidth 50.

## Considerations

- **This relocates coverage enforcement; it must not retire it.** The >90%
  four-metric rule is a hard project rule. Moving it out of the default run is
  only acceptable because the coverage-gated path stays a first-class,
  documented command that `check-all` can run. Say so explicitly in the README
  and in the Final Report, and flag for the developer that a coverage regression
  is now caught by the coverage mode rather than by every `test` invocation.
- Extracting the fold from `gate.ts` must not create a second copy of the
  threshold logic — one implementation, two callers (`don't clone garbage`).
- `takeCoverage()` writes the dump for the *current* process only; the CLI child
  is the process that runs the specs, so folding there is correct — but confirm
  the dump is complete before folding (the flush is synchronous).

## Policies

- `workaholic:implementation` / `objective-documentation` — before/after wall
  clocks measured per package, not asserted.
- `workaholic:implementation` — machine-checkable quality: the coverage gate
  keeps failing a below-threshold package, proven by an actual red run.
- `workaholic:design` / `vendor-neutrality` — no new dependency; the runner
  itself gains no Node-only primitive.
