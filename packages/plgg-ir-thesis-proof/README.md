# plgg-ir-thesis-proof

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

**A runnable formal-proof worked example on the `plgg-ir` stack.** It
takes argumentation models written in the qmu
[概念メタモデル](https://strategy.qmu.dev/metamodel) closed vocabulary —
`主張` / `関係` / `フレーム` / `攻撃` — reusing the
[plgg-ir-thesis](../plgg-ir-thesis/) model, and **formally proves**
properties over them, printing `accept` for a valid argument or a
ranged **counterexample trace** for a doctored one.

```
plgg ── plgg-ir-syntax ── plgg-ir-language ── plgg-ir-thesis ── plgg-ir-thesis-proof
```

The metamodel's `metamodel-semantics.md` claims argumentation
structures carry *statically checkable, formally verifiable*
properties. This package makes that claim **runnable**:

- **反論の完全性** (rebuttal completeness) on 撤退論 vs 継続論 — both
  **遮断** (severing: after removing attacked relations, no premise→root
  derivation path survives) and **被覆** (coverage: every relation has a
  declared attack). The complete `継続論による反論` is accepted; removing
  one attack yields a counterexample trace (遮断: the surviving path
  `競合参入 →r3→ 撤退判断`; 被覆: the unattacked relation `r3`).
- **Dung 生存判定** (grounded extension) on a 論争空間 attack graph —
  computes the surviving set `{外需回復論, 増税必要論}`.

## The proof command

```sh
cd packages/plgg-ir-thesis-proof && npm run prove
```

It loads each flagship example, runs its verification pass, and prints
`accept` or the counterexample trace. See
[docs/plgg-ir/proof-example.md](../../docs/plgg-ir/proof-example.md) for
the annotated example, the exact command, and sample output.

## Develop

```sh
npm run test        # tsc --noEmit && plgg-test src
npm run coverage    # with the >90% four-metric gate
npm run build       # plgg-bundle → dist/{index,prove}.{es,cjs}.js
```

Everything also runs under the monorepo gate `./scripts/check-all.sh`.
