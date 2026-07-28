---
created_at: 2026-07-22T10:00:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on: []
mission: build-the-plgg-ir-thesis-evaluator
---

# Unify plgg-ir-thesis-proof with the full evaluator's compileThesis

## Overview

Two independent `plgg-ir-thesis` implementations exist: this mission's **full
evaluator** (worktree) and a **thinner version** shipped on main via #83
(prove-metamodel, to support `plgg-ir-thesis-proof`). Merging main into this
worktree yields the full evaluator (41-file superset) with **no code conflict**,
but main's `plgg-ir-thesis-proof` then **fails 7 tests** — the full evaluator is
the authoritative one and the proof was written against the thin version.

Root cause (diagnosed): the full `compileThesis`
- wraps `canonical` in the versioned envelope `(plgg-ir-thesis 1 …)` (criterion
  #8) instead of returning bare text, and
- adds a `surviving` field (grounded extension) to `CompiledThesis`, and runs
  the full verification passes (`verifyThesis`, `verifyFrameAttacks/Relations`,
  reference closure, model checking).

So `plgg-ir-thesis-proof`'s `flagshipRebuttal()` / node extraction no longer
loads the 撤退論/継続論 flagship example the way it expects → "flagship example
missing" and the 遮断/被覆 accept/counterexample tests fail.

**The full evaluator is correct** (it matches design.md §5.12/§6/§33). The proof
must be updated to conform to it — not the reverse.

## Key files

- `packages/plgg-ir-thesis/src/domain/usecase/compileThesis.ts` — the canonical
  full version (versioned IR + `surviving`).
- `packages/plgg-ir-thesis-proof/src/domain/model/examples/rebuttal.ts` +
  `rebuttal.spec.ts` — `flagshipRebuttal()` and the failing expectations.
- `packages/plgg-ir-thesis-proof/src/domain/usecase/verifyRebuttal.ts`,
  `reachablePath.ts`, `groundedExtension.ts`, `proofReport.ts`.

## Approach

- Start from the already-integrated (currently red) merge on this branch — the 7
  failures are the exact worklist.
- Update the proof to consume the full evaluator: expect the versioned
  `(plgg-ir-thesis 1 …)` canonical, the new `CompiledThesis` shape, and align
  node/frame extraction with the full `compileThesis`/`analyzeFrame` output.
- Where the proof re-implements checks the evaluator now owns (grounded
  extension, rebuttal verification), prefer consuming the evaluator's usecases
  (`dont-clone-garbage`) rather than keeping divergent copies.
- Re-run `check-all` until green (proof + evaluator both pass).

## Quality Gate

- **Acceptance:** `packages/plgg-ir-thesis-proof` runs green against the full
  `plgg-ir-thesis` (all 7 currently-failing tests pass); `npm run prove` still
  proves 反論の完全性 (遮断/被覆) on 撤退論/継続論 and the Dung grounded
  extension; `./scripts/check-all.sh` green; coverage >90%; no new dependency;
  no `as`/`any`/`ts-ignore`.
- This unblocks ticking the mission's 9 acceptance criteria and closing it.

## Policies

- `workaholic:implementation` / `objective-documentation` (proven by a green
  proof against the canonical evaluator), `dont-clone-garbage` (consume the
  evaluator's usecases, don't keep divergent copies).
- `workaholic:design` / `vendor-neutrality`.
