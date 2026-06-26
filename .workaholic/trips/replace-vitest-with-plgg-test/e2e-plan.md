# E2E / External-Interface Validation Plan (Planner)

- **Author**: Planner (Coding-Phase QA: E2E / external interface)
- **Status**: prep — concurrent-launch
- **Date**: 2026-06-24
- **Scope**: the test runner as a CLI is the external surface validated here.

## 1. Pre-migration baseline (captured this launch)

Environment: macOS, **case-insensitive filesystem**, Node v23.9.0, npm
10.9.2. Per-package install model (no root node_modules). Branch
`work-20260624-135934` at trip HEAD; repo content equals `origin/main`
`c3cd50f` plus trip artifacts.

### Setup performed to reach a testable baseline

1. `scripts/npm-install.sh` — installs 8 packages but **omits
   `plgg-http` and `plgg-router`** (they had no `node_modules`, so their
   `@types/node` was missing → `TS2688`). I installed both manually.
2. `plgg-test` is **not** built by `scripts/build.sh`; I built it
   manually (`npm run build` in `packages/plgg-test`) because `plgg`
   resolves it via `file:../plgg-test`.
3. `scripts/build.sh` — builds all dists in dependency order. Re-run
   after the two installs.

Only `package-lock.json` files changed in the working tree from install;
**no source was touched**.

### Baseline test results (pre-migration)

| Package | runner | result | notes |
| --- | --- | --- | --- |
| `plgg` | plgg-test | **GREEN** 465 passed | already-migrated reference |
| `plgg-test` | plgg-test (self) | **RED** 0 passed / 15 failed | see Finding A |
| `plgg-kit` | vitest | GREEN 12 passed / 6 skipped | ungated |
| `plgg-foundry` | vitest | GREEN 6 passed / 5 skipped | ungated |
| `plgg-sql` | vitest | GREEN 25 passed | gated 91 |
| `plgg-http` | vitest | GREEN 32 passed (after install) | gated 90 |
| `plgg-router` | vitest | GREEN 39 passed (after install) | gated 91 |
| `plgg-fetch` | vitest | GREEN 27 passed (after install) | gated 91 |
| `plgg-view` | vitest | **RED** (typecheck) | see Finding B |
| `plgg-server` | vitest | **RED** (typecheck) | see Finding B (downstream) |
| `example` | vitest | **RED** (typecheck) | see Finding B (downstream) |

### Coverage gates to preserve (from current `vite.config.ts`)

- Gated at **91**: `plgg-fetch`, `plgg-router`, `plgg-server`,
  `plgg-sql`, `plgg-view` (statements/branches/functions/lines).
- Gated at **90**: `plgg-http`.
- **Ungated** (`coverage.all: true`, no threshold): `example`,
  `plgg-foundry`, `plgg-kit`.
- (`plgg` also still carries a dead 91 block — cleanup target U3.)

These six gated numbers are the protection-preserved targets for
direction-v2 criterion 2; the ungated three must stay ungated.

### Baseline grep gate (criterion 1 target = 0)

- `from "vitest"` in `*.spec.ts`: **58 files** (current).
- `vitest`/`@vitest/coverage-v8` devDeps: **10 package.json** (the 9
  migrating + `plgg`).
- vitest coverage `thresholds`/`test:` blocks: in all 10 `vite.config.ts`.

## 2. Pre-existing reds (NOT caused by migration — flagged for the loop)

**Finding A — `plgg-test`'s own suite is red in this environment.** All
15 self-specs fail with `Cannot find module '.../src/index.js'`. The
specs import `"../index.js"` (relative, `.js`-suffixed for a sibling
`.ts`); the runner's self-resolve hook does not resolve that shape here.
This matters because the Architect/Constructor named
`Core/Runner.ts` (throw-handling, underpins the `.resolves` rewrite) and
`Expect/equals.spec.ts` (`toEqual`/`deepEqual` parity) as **fidelity-gate
files** — and those very spec files are currently not executing. U1's
fidelity gate must first get `plgg-test`'s own suite running, or the
gate it depends on cannot be observed. **This is a real precondition for
U1, surfaced now.**

**Finding B — case-collision breaks `plgg-view` and its consumers.** The
repo tracks both `src/Style/` (dir) and `src/style.ts` (file) in
`plgg-view`, and `src/Ssg/` + `src/ssg.ts` in `plgg-server`. These are
distinct in git but **collide on a case-insensitive filesystem**, so
`tsc` reports `TS1149`/`TS1261` and `plgg-view` builds a broken
`dist/style` missing exports (`style_`, `flexCol`, `outline`, …). That
cascades: `plgg-server` and `example` consume the broken dist and fail
to typecheck. This is **pre-existing on `c3cd50f` main**,
environment-specific (case-insensitive FS), and **outside the
migration's scope**. It blocks per-package green for `plgg-view`,
`plgg-server`, and `example` regardless of the runner. The team lead /
Constructor should decide whether this is in-scope to fix or a known
environmental caveat to record; the migration cannot make these three
packages green on this FS without it being addressed.

## 3. Per-ticket E2E validation (the per-package definition-of-done)

For each U2 package ticket, after Constructor reports the migration done,
I run — as the external CLI validator — in this order:

1. **Single run (green gate).**
   `bash scripts/test-<pkg>.sh` → expect `N passed, 0 failed`, exit
   clean. Confirms `tsc --noEmit && plgg-test src` passes. Compare
   passed-count against the baseline above (no silent drop).

2. **Watch-mode smoke (criterion 3).**
   Start `bash scripts/test-watch-<pkg>.sh` (or
   `cd packages/<pkg> && npm run test:watch`); confirm it (a) runs the
   suite once, (b) reacts to a touched spec, (c) stops cleanly. A
   one-shot confirmation per package — parity, not a soak test.

3. **Coverage run (criterion 2, the 6 gated packages only).**
   `cd packages/<pkg> && npm run coverage` → confirm the gate **fires at
   the intended threshold**. Apply the protection-preserved vs
   reported-percentage rule (direction-v2 / model-v2): a *lower reported
   number* under V8-vs-istanbul is acceptable **only** if the gate is
   re-pinned to the measured V8 number **with a one-line rationale** and
   surfaced as an explicit ship-or-defer line item; a *hole in
   protection* (gate silently dropped, file excluded to hit a number) is
   a fail. The 3 ungated packages must report-without-failing (missing
   `plgg-test.config.json`).

A package is "green for the loop" only when 1, 2, and (if gated) 3 all
pass.

## 4. Final whole-repo E2E (trip acceptance)

After U3:

1. `bash scripts/check-all.sh` — build in dependency order + every
   `test-<pkg>.sh` → end-to-end green.
2. **Grep gates (all must be empty):**
   - `grep -rn 'from "vitest"' packages --include="*.ts"` → 0
   - `grep -rl '"vitest"\|@vitest/coverage-v8' packages/*/package.json`
     → 0 (including `plgg`)
   - `grep -rn 'reference types="vitest"' packages/*/vite.config.ts` → 0
3. Confirm no shell-script / CI change was needed (runner-agnostic
   wrappers) — spot-check one `test-watch-*.sh` still drives the loop.

## 5. Notes / handoffs

- **U1 precondition (Finding A)** and the **case-collision
  (Finding B)** are surfaced to the lead now, before the loop, so they
  are not discovered mid-migration.
- `scripts/npm-install.sh` omitting `plgg-http`/`plgg-router` and
  `scripts/build.sh` omitting `plgg-test` are dev-env friction worth a
  follow-up, but I worked around both to establish the baseline; not
  blocking.
