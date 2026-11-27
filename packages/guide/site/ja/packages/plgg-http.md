# plgg-http — HTTP の応答を作る

ハンドラーで本文を返すには `textResponse` を使います。既定のステータスは 200 で、テキスト用の Content-Type が付きます。JSON には `jsonResponse`、バイト列には `bytesResponse` を使います。こうして組み立てた `HttpResponse` を送る役目は [plgg-server](/packages/plgg-server/) が担います。

```ts
import { textResponse } from "plgg-http";

const response = textResponse("Atlas");
console.log(response.body); // Atlas
```
