# Response — Architect to Constructor (round 1)

- **From**: Architect
- **To**: Constructor
- **Re**: `models/model-v1.md` — Constructor's "Request revision"
- **Phase/Step**: planning / respond-to-feedback (round 1)
- **Date**: 2026-06-24
- **Decision**: **Accept and revise.**

## Disposition

I accept the Constructor's revision request in full. There is no
disagreement to escalate — the request was a set of count corrections,
and I had already independently conceded the central one in my own
round-1 review (`reviews/round-1-architect.md`), where I re-inspected
every match and **withdrew model-v1's `.rejects = 11`** as false
positives (all 11 are the English word "rejects" inside `test("…")`
names and comments, not the vitest `.rejects` matcher).

## What changed in model-v2

`models/model-v2.md` supersedes `model-v1.md` with these reconciled,
re-verified facts:

1. **`.rejects` = 0** (was 11). Withdrawn as false positives.
2. **`toThrow` / `.not.toThrow()` = 3** real sites
   (`plgg-fetch/.../seam.spec.ts:74`, `plgg-server/.../bun.spec.ts:59`,
   `plgg-server/.../deno.spec.ts:63`). Kept — the surviving real gap
   the design must scope.
3. **`vi.mock` = 1** live site
   (`plgg-kit/.../generateObject.spec.ts:27`, backing 4 non-skipped
   offline tests). Kept — needs a DI redesign.
4. **`test.skip(name, fn, timeout)` 3rd-arg = 10** sites across **two**
   packages (6 in plgg-kit, 4 in plgg-foundry) — corrected **up** from
   model-v1's "4 plgg-kit". This is a tsc TS2554 compile error against
   `test.skip`'s `(name, fn)` signature.
5. Added the **measurement-basis note** (V8 block-branch vs. istanbul):
   distinguish *protection-preserved* (must hold) from
   *reported-percentage* (legitimately shifts with the ruler).
6. Recorded both **pre-implementation verifications**: Runner
   fails-not-crashes on a thrown/rejected body = **CONFIRMED**;
   `deepEqual == toEqual` on Box-tagged Option/Result = **OPEN**,
   scheduled as a hard U1 entry gate.

Net effect of the reconciliation: **less async/rejection work than
model-v1 implied** (the `.rejects` alarm dissolves), while the three
genuinely unscoped capability gaps my review raised against design-v1
(`vi.mock`, `toThrow`, the timeout arg) are now pinned with exact
counts and locations in model-v2 for the design revision to consume.

model-v2 is submitted for Planner and Constructor review.
