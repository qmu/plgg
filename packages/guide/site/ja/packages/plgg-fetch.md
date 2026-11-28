# plgg-fetch — HTTP の応答を読み取る

`await get(url)` は [plgg-http](/packages/plgg-http/) の応答を `Result` で返します。通信できなければ `Err` です。404 でも応答を受信できれば `Ok` なので、アプリ側でステータスを確認します。

JSON 本文を使うには `decodeJsonBody` に検証関数を渡します。本文が JSON として読めない場合も、項目が合わない場合も、失敗の理由を呼び出し元で扱えます。

## 使い方と制約

`decodeJsonBody(caster)(response) → Result<T, InvalidError>`

通信、HTTP ステータス、本文の検証は別々に失敗します。まず通信結果を開き、ステータスを確認してからデコーダーに渡してください。テキスト以外の本文を JSON として読むと `Err` になります。

```ts
import { asStr } from "plgg";
import {
  jsonResponse,
  textResponse,
} from "plgg-http";
import { decodeJsonBody } from "plgg-fetch";

const title = decodeJsonBody(asStr);
console.log(title(jsonResponse("Atlas")).__tag);
console.log(title(textResponse("{")).__tag);
```

## 受け取り方に合った関数を使う

本文全体が必要な画像なら readAs に bytes を選び、`readBytes`(response) で Uint8Array を得ます。大きな転送を順に消費したい場合は stream を選び、`readStream` の成功値を非同期に反復します。`readText` にバイト列を渡しても暗黙の文字コード変換は起きません。
