# A runnable formal-proof worked example (plgg-ir-thesis-proof)

The qmu [概念メタモデル](https://strategy.qmu.dev/metamodel) and its
[metamodel-semantics](https://strategy.qmu.dev/metamodel-semantics)
companion claim that argumentation structures written in the metamodel's
closed vocabulary — 主張 / 概念 / 関係 / フレーム / 論旨 / ストラクチャー —
carry **statically checkable, formally verifiable** properties: whether a
rebuttal is complete, which theses survive an attack graph. The
[`plgg-ir-thesis-proof`](../../packages/plgg-ir-thesis-proof/) package makes
that claim **runnable**. It reuses the
[`plgg-ir-thesis`](../../packages/plgg-ir-thesis/) model (主張 / 関係 /
フレーム / 攻撃) and proves two of the semantics doc's flagship properties,
printing `accept` for a valid argument or a ranged **counterexample trace**
for a doctored one — from one command.

## The command

```sh
cd packages/plgg-ir-thesis-proof && npm run prove
```

It builds the package and runs each flagship example through its
verification pass. The examples are written in the metamodel's own surface
syntax and compiled with `compileThesis` (the thesis dialect parses
主張/関係/フレーム/攻撃), so the proof is of the metamodel's concept, not an
ad-hoc re-encoding.

## Case 1 — 反論の完全性 (rebuttal completeness), 撤退論 vs 継続論

The target assertion 撤退論 and the rebuttal frame 継続論による反論, verbatim
from `metamodel-semantics.md` §反論の完全性:

```lisp
(主張 撤退論
  :ロジック 因果的
  :ルート (概念 撤退判断)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減)   :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))
```

Two orthogonal completeness properties are checked (both are pure graph
model-checks over the declared relation DAG — never a search):

- **遮断 (severing / cut)** — remove every 関係 the frame attacks, then
  check no premise concept still reaches the ルート
  (`¬⟨any*⟩root` on the residual graph). The complete rebuttal severs
  every path, so it is accepted. Removing `(攻撃 s3 掘り崩し r3)` leaves the
  path `競合参入 →r3→ 撤退判断` alive — the surviving-path counterexample.
- **被覆 (coverage)** — check every 関係 of the target has an attack mapped
  onto it (`[U](edge → attacked)`). Removing s3 leaves r3 unattacked — the
  unattacked-relation counterexample.

## Case 2 — Dung 生存判定 (grounded extension), 論争空間

From `metamodel-semantics.md` §検証カタログ 11: three 論旨 and two attacks —
景気失速論 attacks 増税必要論, and 外需回復論 attacks 景気失速論. The grounded
extension (the least fixpoint of Dung's characteristic function) is computed
over the attack graph; the survivors are `{外需回復論, 増税必要論}` (外需回復論
neutralises 景気失速論, lifting its attack on 増税必要論) and 景気失速論 is
defeated.

## Sample output

Running `npm run prove` prints (stderr module-type warnings elided):

```text
== 反論の完全性 (rebuttal completeness) — 撤退論 vs 継続論 ==

完全な反論 (継続論による反論: s1→r1, s2→r2, s3→r3):
  遮断 (severing): accept
  被覆 (coverage): accept

s3を欠いた反論 ((攻撃 s3 掘り崩し r3) を除去):
  遮断 (severing): REJECT
      反例 (counterexample): 遮断が成立していない — 導出経路 競合参入 →r3→ 撤退判断 が生き残っている
  被覆 (coverage): REJECT
      反例 (counterexample): 被覆が成立していない — 関係 r3 (競合参入 → 撤退判断) に攻撃対応が宣言されていない

== Dung 生存判定 (grounded extension) — 論争空間 ==

  survivors (生存): {増税必要論, 外需回復論}
  defeated (敗退):  {景気失速論}
```

The verdicts are also fixed by vitest fixtures in the package
(`verifyRebuttal.spec.ts`, `examples/rebuttal.spec.ts`,
`groundedExtension.spec.ts`, `proofReport.spec.ts`), so the proof is
reachable three ways: the runnable command, the tests, and this doc.

## How it works

- `verifyRebuttal.ts` — `verifySevering` / `verifyCoverage`, pure graph
  checks returning ranged `SemDiagnostic` counterexamples (empty accepts).
- `reachablePath.ts` — pure depth-first reachability over the thesis
  `Relation` model, returning the surviving path for the 遮断 trace.
- `groundedExtension.ts` — the monotone least-fixpoint of Dung's
  characteristic function (deterministic, polynomial, no search).
- `examples/rebuttal.ts`, `examples/debate.ts` — the flagship inputs.
- `proofReport.ts` + `entrypoints/prove.ts` — the printed report.

Every rejection carries a concrete, human-readable trace of exactly why —
the same machine-correctable diagnostic shape plgg-ir uses everywhere.

---

Back to the [plgg-ir guide](guide.md).
