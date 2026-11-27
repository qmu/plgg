# plgg-server — Route a request to a handler

Start with `web()` and register handlers with `get` or `post`. To test a route without opening a port, pass the application and a [plgg-http](/packages/plgg-http/) request to `handle`. Where the host supplies a standard `Request`, `toFetch(app)` converts it and returns a promise for a standard `Response`.

```ts
import { ok, pipe } from "plgg";
import { textResponse } from "plgg-http";
import { get, toFetch, web } from "plgg-server";

const app = pipe(web(), get("/title", async () => ok(textResponse("Atlas"))));
const response = await toFetch(app)(new Request("https://example.org/title"));
console.log(await response.text()); // Atlas
```
