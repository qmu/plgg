# plgg-ir-thesis-proof — 論証の反例を読む

ワークスペースをビルドしたら `packages/plgg-ir-thesis-proof` で `npm run prove` を実行します。反論がすべてそろう例と、一つ欠ける例の結果が続けて表示されます。`accept` と反例の表示を比べて、どの関係を取り除いたために遮断や被覆の条件が崩れたかを確認できます。

## 使い方と制約

`proofReport() → ReadonlyArray<SoftStr>`

出力は行の配列なので、CLI 以外でも同じ報告を表示できます。遮断は前提からルートへ抜ける道が残るか、被覆は必要な関係が攻撃されたかという別の問いです。診断の位置と残った関係を元のモデルでたどってください。

```ts
import { proofReport } from "plgg-ir-thesis-proof";

console.log(proofReport().join("\n"));
```

## 一箇所だけ条件を変える

COMPLETE_SEVERING と DOCTORED_SEVERING は遮断を比べる入力で、被覆には COMPLETE_COVERAGE と DOCTORED_COVERAGE があります。報告を読むときは、まず同じ条件の完全版と攻撃を除いた版を見比べます。遮断の完全版と被覆の変更版を比べると、何の違いを観察したのか分からなくなります。
