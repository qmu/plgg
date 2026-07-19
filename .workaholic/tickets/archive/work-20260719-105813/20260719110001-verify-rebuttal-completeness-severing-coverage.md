---
created_at: 2026-07-19T11:00:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on:
mission: prove-metamodel-concept-on-plgg-ir
---

# Verify 反論の完全性 — 遮断 (severing) and 被覆 (coverage) with counterexample traces

## Overview

Implement the two rebuttal-completeness checks from `metamodel-semantics.md`
§反論の完全性, over the `plgg-ir-thesis` model. A rebuttal is a フレーム
`f: A → B` carrying 攻撃 declarations, each pointing a relation of the attacker A
at a relation of the target B. Given the target 主張 B (a DAG of 関係 from
premise 概念 to the ルート概念):

- **遮断 (severing / cut):** remove every 関係 of B that is attacked, then check
  there is **no path** from any premise concept to the ルート. Accept iff no
  derivation path survives. Counterexample = a surviving path
  (e.g. `競合参入 →r3→ 撤退判断`).
- **被覆 (coverage):** check **every** 関係 of B has at least one attack mapped
  onto it. Accept iff all covered. Counterexample = an unattacked 関係.

Both are pure graph checks over B's relation DAG (reuse `graph.ts`; the ルート and
接続元/接続先 are already on the model). Return ranged `SemDiagnostic`
counterexamples (same shape as `verifyThesis`); empty result = accept.

## Key files

- `packages/plgg-ir-thesis-proof/src/domain/usecase/verifyRebuttal.ts` — new:
  `verifySevering(target, frame)` and `verifyCoverage(target, frame)` (or one
  `verifyRebuttal(target, frame, requirement)` switching on 遮断/被覆).
- Reuse: `plgg-ir-thesis/domain/model` (Assertion, Relation, Attack, Frame,
  Concept) and `plgg-ir-thesis/domain/usecase/graph` (reachability helpers).
- `packages/plgg-ir-thesis/src/domain/usecase/graph.ts` — read for the existing
  reachability/DAG utilities; reuse, don't re-implement.

## Steps

1. Build B's directed graph: nodes = 概念, edges = 関係 (接続元 → 接続先); mark
   premise concepts (no incoming) and the ルート.
2. 遮断: delete edges whose 関係 id appears as an attack target in the frame;
   run reachability premise→ルート on the残graph; if reachable, return the
   surviving path as the counterexample trace.
3. 被覆: collect attacked 関係 ids from the frame; any B 関係 not in the set is a
   counterexample.
4. Represent the requirement selection so the example can ask for 遮断 (default,
   per the doc) or 被覆; return `SemDiagnostic[]` (ranged, human-readable).
5. Unit-test both directions with a tiny hand-built model in this ticket
   (the flagship example lands in the next ticket).

## Policies

- **Implementation — gaps in reasoning are machine-checkable early.** The check
  is the whole point: a structurally-incomplete rebuttal is rejected with a
  precise, ranged counterexample rather than silently accepted.
- **Implementation — deterministic, total analysis.** Pure graph functions over
  the declared model; no non-deterministic search (the metamodel's
  bisimulation-invariant / model-checking discipline).

## Quality Gate

- **Acceptance:** `verifySevering` accepts a rebuttal whose attacks cut every
  premise→root path and rejects (with the surviving path) one that leaves a path;
  `verifyCoverage` accepts iff every relation is attacked and otherwise names the
  unattacked relation. No `as`/`any`/`ts-ignore`; coverage >90%.
- **Verification method:** unit tests over a small constructed model exercising
  both accept and counterexample branches.
- **Gate that must pass:** `./scripts/check-all.sh` green.

## Considerations

- Prefer `proc`/pipeline short-circuits over `isErr`-guard chains (coverage
  branch-gate). Read the coverage gotchas note before writing defensive guards.
- The attacked-relation set may reference relations that do not exist in B — that
  is the ストローマン case; treat an unresolved attack target as its own
  diagnostic (a later ticket exercises it) rather than crashing.
