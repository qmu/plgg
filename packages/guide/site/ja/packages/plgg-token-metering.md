# plgg-token-metering — トークン数と費用を見積もる

`countTokens(input)(counter)` の結果を読むときは、語彙を使った BPE の計数値か、校正データによる推定値かを確認します。BPE 用の語彙は呼び出し側で用意します。推定値には精度情報があるので、`tokenBounds` で幅を求め、`projectCost` で費用の見込みを出せます。

## 使い方と制約

`countTokens(input)(counter) → Result<TokenEstimate, MeteringError>`

見積もりの中心値だけを予算と比較すると誤差を見落とします。`tokenBounds` は誤差率の上端から下限を、下端から上限を求め、外側に丸めます。料金を見積もる前に語彙と対象モデルが合っているか確かめます。

```ts
import { proc } from "plgg";
import {
  cardFor,
  countTokens,
  estimatorCounter,
  modelId,
  tokenBounds,
} from "plgg-token-metering";

console.log(
  await proc(
    cardFor(modelId("claude-sonnet-5")),
    (card) => estimatorCounter({ card }),
    countTokens({
      text: "Atlas",
      textClass: "english",
    }),
    tokenBounds,
  ),
);
```

## 見積もりに根拠を添える

cardFor(modelId(...)) 自体が `Result` を返します。未登録モデルの場合はそこで止め、別のモデルの価格や分割規則を流用しないようにします。件数だけなら `estimateTokens`(estimate)、誤差の根拠も必要なら `estimateAccuracy`(estimate) を使います。
