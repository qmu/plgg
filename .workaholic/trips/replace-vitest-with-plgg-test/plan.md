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

## Progress

- [x] [Planner] direction-v1 → direction-v2 (approved)
- [x] [Architect] model-v1 → model-v2 (approved)
- [x] [Constructor] design-v1 → design-v2 (approved)
- [x] One-turn review round (round-1 ×3) + responses
- [x] [Constructor] Decomposition: design-v2 → 11 tickets (4b9d141)
- [ ] [Coding] Concurrent launch (dev-env / codebase discovery / queue reconfirm)
- [ ] [Coding] Per-ticket drive loop: U1 → 9×U2 → U3
