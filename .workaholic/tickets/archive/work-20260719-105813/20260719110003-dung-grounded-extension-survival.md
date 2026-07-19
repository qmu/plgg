---
created_at: 2026-07-19T11:00:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
depends_on:
mission: prove-metamodel-concept-on-plgg-ir
---

# Dung 生存判定 — grounded extension over an attack graph

## Overview

Implement Dung's grounded extension (`metamodel-semantics.md` §検証カタログ 11)
over an attack graph of 論旨: nodes = arguments, edges = 攻撃 (A attacks B).
Compute the grounded extension by the standard characteristic-function fixpoint
(iteratively collect arguments defended by the current set; a node is defended
when every attacker of it is attacked by the set). Encode the doc's 論争空間
example (増税必要論, 景気失速論 attacks 増税必要論, 外需回復論 attacks 景気失速論)
and prove the survivors are `{外需回復論, 増税必要論}`.

## Key files

- `packages/plgg-ir-thesis-proof/src/domain/usecase/groundedExtension.ts` — new:
  `groundedExtension(args, attacks): { survivors, defeated }` (a total fixpoint).
- `packages/plgg-ir-thesis-proof/src/domain/model/examples/debate.ts` — the
  論争空間 example (three 論旨 + two 攻撃 文脈).

## Steps

1. Model the attack graph minimally (argument ids + attack pairs). Reuse the
   thesis 攻撃/文脈 model where it fits; a small local structure is fine if the
   full 論旨/論評 model is heavier than needed for the fixpoint.
2. Implement the monotone characteristic-function iteration to a fixpoint
   (grounded extension is the least fixpoint; terminates for finite graphs).
3. Return survivors and defeated as data; format the survivor set for the
   command/trace.
4. Test on the 論争空間 example: survivors == {外需回復論, 増税必要論},
   景気失速論 defeated.

## Policies

- **Implementation — deterministic, total analysis.** The grounded extension is
  unique and computed in polynomial time by a monotone fixpoint — no search, no
  non-determinism; matches the metamodel's model-checking discipline.
- **Implementation — machine-checkable structure.** "Which thesis survives" is a
  computed fact over the declared attack graph, not a judgement call.

## Quality Gate

- **Acceptance:** `groundedExtension` returns `{外需回復論, 増税必要論}` as
  survivors and `景気失速論` as defeated on the 論争空間 example; the function is
  total for any finite attack graph. No `as`/`any`/`ts-ignore`; coverage >90%.
- **Verification method:** unit test on the 論争空間 example plus a trivial
  no-attack graph (all survive) for the base case.
- **Gate that must pass:** `./scripts/check-all.sh` green.

## Considerations

- Keep the fixpoint obviously terminating (bounded by the finite argument set);
  prefer a pure reduce/iterate over mutable loops per the house style.
