---
instruction: "to replace all tests by plgg-test in this repository (no more vitest), if you cannot, refine plgg-test to make this happen"
phase: coding
step: concurrent-launch
iteration: 1
updated_at: 2026-06-24T14:18:00+09:00
---

# Trip Plan

## Initial Idea

to replace all tests by plgg-test in this repository (no more vitest), if you cannot, refine plgg-test to make this happen

## Plan Amendments

### Amendment 1 — Consensus reached, plan fixed (planning/moderation skipped)

The Planning Phase converged after one review round with no escalation. All v2 artifacts approved:
direction-v2 (3a7ce69), model-v2 (6c37c2a), design-v2 (39d7b59).

Reconciled facts (settled by re-grepping during review):
- `.rejects` = **0** — Architect withdrew its v1 count of 11 (false positives: the English word "rejects" in test names); Constructor's 0 confirmed. The proposed `.rejects` refinement is dropped.
- `toThrow`/`.not.toThrow()` = **3** real sites (seam.spec:74, bun.spec:59, deno.spec:63) → hand-rewrite to existing API, **no new matcher** (R3).
- `vi.mock` = **1** live site (plgg-kit generateObject.spec, offline path) → typed DI redesign, no `as`/`any` (R5).
- `test.skip` extra timeout arg = **10** across two packages (6 plgg-kit + 4 plgg-foundry) → drop the arg, fixes TS2554 (R4).
- `toBeGreaterThanOrEqual` = 1 site (foundry) → the ONLY plgg-test source change (R1).
- Coverage: 6 packages re-gate via per-package `plgg-test.config.json` (fetch/router/server/sql/view=91, http=90); 3 stay ungated (R2).
- Pre-impl gates: Gate A (Runner fails-not-crashes on thrown body) = CONFIRMED; Gate B (deepEqual ≡ vitest toEqual on Box-tagged Option/Result) = OPEN, hard U1 entry gate.

Delivery: **U1** (R1 + Gate B) → **U2** (9 per-package migrations, leaf-first, with R3/R4/R5 placed in the fetch/server/kit/foundry tickets) → **U3** (plgg cleanup + final grep gate proving zero `from "vitest"` and zero new `as`/`any`).

### Amendment 2 — Three Coding-Phase launch blockers (leader-verified) + scope decision

The concurrent launch surfaced three blockers, all confirmed by the leader against the real repo:

1. **Finding A — plgg-test self-suite is red (0/15).** Every plgg-test self-spec fails `Cannot find module .../src/index.js`; the specs import `from "../index.js"` (relative) and the self-resolve hook does not map the `.js`-suffixed relative import to the `.ts` source. Blocks observing Gate B (equals.spec / Runner.spec are among the failing). Migrated specs import `from "plgg-test"` (the alias, like plgg's 465 passing tests) and are unaffected — this is specifically a self-suite resolution gap. **IN MANDATE** ("refine plgg-test"): fix as the first action of U1; Gate B cannot be observed until plgg-test's own suite runs.

2. **DOM environment seam — missing.** 4 specs (`example/src/app.spec.ts`, plgg-view `render`/`application`/`sandbox`.spec.ts) use `// @vitest-environment happy-dom` + a live DOM; plgg-test runs under plain Node with no env seam → `document is not defined`. **IN MANDATE** ("refine plgg-test"): add a DOM-environment capability to plgg-test (new foundation ticket).

3. **Finding B — pre-existing FS case collision (OUT of original scope).** Volume is case-insensitive; repo tracks both `src/style.ts` + `src/Style/` (plgg-view) and `src/ssg.ts` + `src/Ssg/` (plgg-server) → `TS1149` "differs only in casing", failing `tsc --noEmit` for plgg-view → plgg-server → example. Pre-existing on `main` (c3cd50f), independent of the runner, passes on case-sensitive CI. **DEVELOPER DECISION: fix in-scope** — rename the colliding lowercase barrel files / merge into the `Style/`/`Ssg/` directories, preserving public exports. New foundation ticket; view/server/example U2 tickets depend on it.

Revised foundation order: **U0-fs-collision** + **U1** (R1 + Finding A fix + Gate B) + **U1-dom** (DOM seam) → U2 (9 per-package) → U3 (cleanup + grep gate).

Other launch facts: system-safety `system_changes_authorized=false` (project-local only — fine); baseline greens = plgg/kit/foundry/sql/http/router/fetch; coverage gates 91 (fetch/router/server/sql/view), 90 (http), ungated (example/foundry/kit); 58 vitest spec imports + 10 package.json vitest devDeps (incl. plgg) + 10 vite.config vitest blocks to remove. Gate A (Runner fails-not-crashes) confirmed.

## Progress

- [x] [Planner] direction-v1 → direction-v2 (approved)
- [x] [Architect] model-v1 → model-v2 (approved)
- [x] [Constructor] design-v1 → design-v2 (approved)
- [x] One-turn review round (round-1 ×3) + responses
- [x] [Constructor] Decomposition: design-v2 → 11 tickets (4b9d141), amended to 13 (6bb3247)
- [x] [Coding] Concurrent launch (dev-env / codebase discovery / queue reconfirm) — 3 blockers found
- [x] [Coding] U1 foundation archived (81681f0): Finding A fix (self-suite 0→84), R1 matcher, Gate B parity (deepEqual≡toEqual, no divergence)
- [x] [Coding] U1-dom archived (e5400ba): leak-proof DOM-environment seam (self-suite 84→86), 1 revision cycle (window/self/top leak caught by Architect, fixed)
- [x] [Coding] U0-fix-fs-case-collision archived (5acdbbc): style.ts→styleEntry.ts, ssg.ts→ssgEntry.ts, public API preserved, Finding B cleared
- [ ] [Coding] U2 per-package ×9 (leaf-first: http,kit,router,sql,fetch,foundry,view,server,example)
  - [ ] http  - [ ] kit  - [ ] router  - [ ] sql  - [ ] fetch  - [ ] foundry  - [ ] view  - [ ] server  - [ ] example
- [ ] [Coding] U3 cleanup + final grep gate (+ carry-overs below)

### Coding-phase carry-overs (to fold into later reviews / U3 final acceptance)

From U1: (a) direct rewriteRelativeTs resolver assertion for a ?t=-carrying parent; (b) mixed number/bigint >= case; (c) undefined-vs-absent-inside-Box deepEqual assertion.
From U1-dom: (d) document the Node-version-dependent skip-if-present interop assumption + possible force-install allow-list; (e) count/added-set-empty leak assertion (future-proof beyond the 4-name list); (f) mark fixtures/ as runFile-only or anchor Discovery/find.ts glob to src.
From U1 (Planner): (g) at U3 final acceptance, surface every coverage exclude + lowered threshold as explicit ship-or-defer line items (criterion-2 audit).
