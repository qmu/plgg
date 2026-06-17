# plgg-fetch

A **typed HTTP client**, built from scratch on
[plgg](/packages/plgg/), for the presentation layer to
call a server. It is the symmetric peer of
[plgg-server](/packages/plgg-server): both build on the
shared [plgg-http](/packages/plgg-http) model — so
neither imports the other — requests/responses are pure
plgg data, failures are values, and native
`fetch`/`Request`/`Response` appear **only at one seam**.
Runtime deps: `plgg` and `plgg-http`.

## Usage

```typescript
import { get, post, decodeJsonBody } from "plgg-fetch";
import {
  pipe, matchResult, cast,
  asObj, asSoftStr, forProp, encodeJson,
} from "plgg";

const result = await get("https://api.example.com/users/7");

pipe(
  result,
  matchResult(
    (err) => console.error("transport failed:", err), // NetworkError only
    (res) =>
      pipe(
        res,
        decodeJsonBody((v) =>
          cast(v, asObj, forProp("name", (x) => cast(x, asSoftStr))),
        ),
        matchResult(
          () => console.log(`status ${res.status.content}, unexpected shape`),
          (user) => console.log("user:", user),
        ),
      ),
  ),
);
```

## API

- **`request(method, url, { headers?, query?, body? })`**
  — the core call; all arguments at once (**not** a
  `pipe` step).
- **`get` / `post` / `put` / `patch` / `del`** — method
  conveniences over `request` (`del`, since `delete` is
  reserved).
- **`decodeJsonBody(as)(response)`** — read the text
  body, [`decodeJson`](/packages/plgg/values-effects#functionals-effect-utilities),
  then run a `cast`-based parser; the chain is a
  `Result<T, InvalidError>`.

All calls return `PromisedResult<HttpResponse, ClientError>`,
where `ClientError = HttpError | NetworkError` — the
shared `HttpError` vocabulary widened with the
client-only `NetworkError`.

## Failure policy

This is the central contract:

- **A non-2xx status is a valid response, not an error.**
  `404`, `500`, etc. come back as `Ok(HttpResponse)`; the
  caller inspects `response.status` and decides. The
  client never guesses what a status "means" for your
  domain.
- **Only a transport/build failure is an error.** A DNS
  failure, refused connection, malformed URL, or
  unreadable body folds to `Err(NetworkError)` — there is
  no HTTP response in that case.

Note the consumption idiom: the client folds responses
with [`matchResult`](/concepts/match), **not** `proc` —
per the house style, `proc` is for server/async
orchestration, while the client matches the result
explicitly.

## The seam

Web platform types live in exactly one module:
`toFetchRequest(req): Request` (plgg → native) and
`fromFetchResponse(res): PromisedResult<HttpResponse, ClientError>`
(native → plgg). This mirrors the server's seam in the
opposite direction, reusing the same `plgg-http` model so
client and server stay symmetric.

Out of scope for the POC: retries, interceptors,
streaming response bodies, auth/cookie flows, and
cancellation.
