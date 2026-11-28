# plgg-server — Route a request to a handler

Start with `web()` and register handlers with `get` or `post`. To test a route without opening a port, pass the application and a [plgg-http](/packages/plgg-http/) request to `handle`. Where the host supplies a standard `Request`, `toFetch(app)` converts it and returns a promise for a standard `Response`.

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

## Working with the API

`toFetch(app: Web) → Fetch`

Separate dispatch from the listening socket. Calling the result of toFetch with a Request exercises route lookup and error-to-response conversion. Read a captured id with param("id")(context), then handle absence and validate its format.

## Choose the boundary for a test

handle(app, request) returns a promised `Result`<`HttpResponse`, HttpError>. An unregistered path lets a test inspect the precise error. Through toFetch the same failure becomes a standard Response with a status and body. Choose the former for dispatch decisions and the latter for client-visible behavior.
