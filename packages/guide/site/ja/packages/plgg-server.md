# plgg-server — リクエストをハンドラーに渡す

`web()` で空のルート表を作り、`get` や `post` でハンドラーを加えます。`handle` にはアプリと [plgg-http](/packages/plgg-http/) のリクエストを渡すので、ポートを開かずにルートをテストできます。標準の `Request` を受け取る環境では `toFetch(app)` が変換を引き受けます。

```ts
import { ok, pipe } from "plgg";
import { textResponse } from "plgg-http";
import { get, toFetch, web } from "plgg-server";

const app = pipe(
  web(),
  get("/title", async () =>
    ok(textResponse("Atlas")),
  ),
);
const response = await toFetch(app)(
  new Request("https://example.org/title"),
);
console.log(await response.text()); // Atlas
```

## 使い方と制約

`toFetch(app: Web) → Fetch`

ルートを決める処理と通信の待ち受けを分けます。toFetch の戻り値に Request を渡すと、経路の照合からエラー応答への変換まで通ります。パスの値を取りたいときは param("id")(context) で `Option` を受け取り、必要に応じて数値などに検証します。

## 試験する境界を選ぶ

handle(app, request) の結果は `Promise` に包んだ `Result`<`HttpResponse`, HttpError> です。未登録のパスを渡して `Err` の種類を調べられます。toFetch を通す試験では同じ失敗を標準の Response として受け取り、status と本文を確認します。前者はルーティングの理由を、後者はクライアントからの見え方を調べるのに向いています。
