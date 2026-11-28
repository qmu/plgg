# plgg-kit — モデルに構造化出力を依頼する

`generateObject` にプロバイダー、`userPrompt`、出力の `schema` を渡します。OpenAI、Anthropic、Google の呼び分けはプロバイダーの値で決まります。成功値の型は `unknown` なので、アプリで使う前に [cast](/concepts/validation/) で検証します。テストでは `post` を差し替えて応答を用意できます。

## 使い方と制約

`generateObject({ provider, userPrompt, schema, post? })`

モデルに渡す schema は出力形式の指定です。受け取った値を自分の型として使うには、`asObj` と `forProp` などで必要な項目を確認してください。プロバイダーにキーを指定しなければ対応する環境変数から取得します。

```ts
import { ok } from "plgg";
import { generateObject, openai } from "plgg-kit";

const result = await generateObject({
  provider: openai({
    model: "gpt-5.1",
    apiKey: "offline",
  }),
  userPrompt: "Give one title",
  schema: { type: "string" },
  post: () => async () =>
    ok({
      output: [
        { content: [{ text: '"Atlas"' }] },
      ],
    }),
});
console.log(result);
```

## ネットワークを使わず応答を試す

上の例の post は、OpenAI 側の output、content、text という入れ物まで含めて返します。text の中身が JSON として読めるかも実際の処理を通ります。最終的な題名だけを返すと別の場所で失敗するので、差し替える関数が通信とデコードのどちらの側にあるか意識してください。
