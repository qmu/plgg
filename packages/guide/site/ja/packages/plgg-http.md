# plgg-http — HTTP の応答を作る

ハンドラーで本文を返すには `textResponse` を使います。既定のステータスは 200 で、テキスト用の Content-Type が付きます。JSON には `jsonResponse`、バイト列には `bytesResponse` を使います。こうして組み立てた `HttpResponse` を送る役目は [plgg-server](/packages/plgg-server/) が担います。

```ts
import { textResponse } from "plgg-http";

const response = textResponse("Atlas");
console.log(response.body); // Atlas
```

## 使い方と制約

`textResponse(body, status?, headers?) → HttpResponse`

ハンドラーを試すだけなら、ソケットを開かずに body と headers を調べられます。画像などのバイト列はテキストに変換せず bytesResponse に渡します。送受信の都合でドメインの関数に Request を渡す必要はありません。

## ステータスと本文を別々に決める

作成済みを表す 201 と新しい資料の場所を返すには、statusOf とヘッダーの辞書を渡します。Content-Type を自分で指定する場合は小文字の content-type を使ってください。コンストラクターはこのキーがあれば値を保ちます。

```ts
import {
  jsonResponse,
  statusOf,
} from "plgg-http";

const created = jsonResponse(
  { title: "Atlas" },
  statusOf(201),
  {
    location: "/books/1",
  },
);
console.log(
  created.status,
  created.headers,
  created.body,
);
```
