---
created_at: 2026-07-19T11:00:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
depends_on:
mission: prove-metamodel-concept-on-plgg-ir
---

# Author the flagship rebuttal example (撤退論 vs 継続論) as runnable input

## Overview

Encode the semantics doc's flagship example so the verification passes can run on
it: 撤退論 (target, 因果的, ルート 撤退判断, relations r1/r2/r3), 継続論 (attacker),
and the フレーム `継続論による反論` with attacks (s1 掘り崩し r1, s2 切り崩し r2,
s3 掘り崩し r3). Provide two forms of the frame: the **complete** one (all three
attacks — accepted) and a **doctored** one with `(攻撃 s3 …)` removed — which the
verifier must reject with a counterexample (遮断: `競合参入 →r3→ 撤退判断`
survives; 被覆: r3 unattacked).

## Key files

- `packages/plgg-ir-thesis-proof/src/domain/model/examples/rebuttal.ts` (or a
  `.thesis` source under `examples/`) — the encoded model.
- `packages/plgg-ir-thesis/src/domain/usecase/compileThesis.ts` and
  `thesisForms.ts` — check whether the surface syntax parses 主張/関係/フレーム/
  攻撃 forms today; the フレーム form is registered.

## Steps

1. First try the surface syntax: write the example as the S-expression from
   `metamodel-semantics.md` and run it through `compileThesis`. If it parses to
   the model cleanly, use that path (the proof is then of the metamodel's own
   surface vocabulary).
2. If the dialect does not yet parse 攻撃 forms (that is the sibling mission's
   T4), fall back to constructing the typed model values directly with the
   `plgg-ir-thesis` model builders — keep the Japanese identifiers so the example
   still reads as the metamodel's concept. Document which path was used.
3. Expose `完全な反論` and `s3を欠いた反論` as two named example values the next
   ticket's command and tests consume.

## Policies

- **Implementation — information stays reachable / faithful to the source.** The
  example is the strategy book's verbatim case; encode it so the proof is of the
  metamodel's concept, not an ad-hoc re-encoding.
- **Development — don't clone garbage.** If using the typed builders, construct
  the model cleanly; don't copy a malformed fixture.

## Quality Gate

- **Acceptance:** the two example values (complete / doctored) exist, type-check,
  and feed the verification passes; running 遮断 on the complete one accepts and
  on the doctored one returns the surviving-path counterexample.
- **Verification method:** a unit test asserting accept on complete and the
  specific counterexample on doctored.
- **Gate that must pass:** `./scripts/check-all.sh` green.

## Considerations

- Keep the two frames sharing the same 撤退論/継続論 so the only difference is the
  removed attack — that makes the counterexample crisp.
- Record in the commit whether the surface-syntax or typed-builder path was used
  (informs the sibling evaluator mission).
