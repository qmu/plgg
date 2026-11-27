# plgg-server — リクエストをハンドラーに渡す

`web()` で空のルート表を作り、`get` や `post` でハンドラーを加えます。`handle` にはアプリと [plgg-http](/packages/plgg-http/) のリクエストを渡すので、ポートを開かずにルートをテストできます。標準の `Request` を受け取る環境では `toFetch(app)` が変換を引き受けます。

```ts
import { ok, pipe } from "plgg";
import { textResponse } from "plgg-http";
import { get, toFetch, web } from "plgg-server";

const app = pipe(web(), get("/title", async () => ok(textResponse("Atlas"))));
const response = await toFetch(app)(new Request("https://example.org/title"));
console.log(await response.text()); // Atlas
```
