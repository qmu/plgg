# plgg-ir-thesis — 主張と関係を検証する

主張や主張間の関係を記述し、`compileThesis` に渡します。成功すると `nodes`、正規化した `canonical`、攻撃関係から求めた `surviving` が得られます。関係の循環など、フレームの規則に反する場合は原文の範囲を示す診断が返ります。[反例を読む実例](/packages/plgg-ir-thesis-proof/)で結果を比べられます。

## 使い方と制約

`compileThesis(source) → Result<CompiledThesis, ReadonlyArray<SemDiagnostic>>`

surviving は攻撃関係から計算した grounded extension です。主張の文章が事実かどうかを判定する値ではありません。どの攻撃が結果を変えたかを調べるには、関係を一つ除いたモデルと比較します。

```ts
import { compileThesis } from "plgg-ir-thesis";

console.log(
  compileThesis("(unknown-form)").__tag,
);
```

## 構造の検査と生存判定

verifyThesis(nodes) は解析済みの主張やフレームを検査します。時間的な関係に循環がある場合などはこの段階で診断が返ります。`compileThesis` は診断が空のときに `groundedExtension`(nodes) を呼びます。この順序を守ると、形式を直すべきモデルの出力を有効な議論の結果と取り違えずに済みます。

## 同じ条件で二つのモデルを比べる

検証済みの入力を一から書く前に、[証明例](/packages/plgg-ir-thesis-proof/)の遮断モデルを使ってみましょう。攻撃を一つ取り除いた版と比べると、同じ形式で読めるモデルでも、要求した遮断の条件を満たすかどうかで結果が分かれます。

```ts
import { compileThesis } from "plgg-ir-thesis";
import {
  COMPLETE_SEVERING,
  DOCTORED_SEVERING,
} from "plgg-ir-thesis-proof";
import assert from "node:assert/strict";

assert.equal(
  compileThesis(COMPLETE_SEVERING).__tag,
  "Ok",
);
assert.equal(
  compileThesis(DOCTORED_SEVERING).__tag,
  "Err",
);
```
