# plgg-fetch

A **typed HTTP client** built from scratch on [plgg](../plgg/), for the
presentation layer to call a server. It is the symmetric peer of
[`plgg-server`](../plgg-server/): both build on the shared HTTP model in
[`plgg-http`](../plgg-http/) — so neither imports the other — requests/responses
are pure plgg data, failures are values, and the native `fetch`/`Request`/
`Response` types appear **only at one seam**. plgg-fetch's runtime dependencies
are `plgg` and `plgg-http` (no `plgg-server`).

> **UNSTABLE / EXPERIMENTAL POC.** The public surface may still change. plgg
> discipline is non-negotiable: dogfood plgg types/combinators, errors as
> values, expression-only bodies, platform types only at the seam, no
> `as`/`any`/`@ts-ignore`.

## Install

```bash
npm install plgg-fetch
```

## Usage

```ts
import { get, post, decodeJsonBody } from "plgg-fetch";
import { pipe, matchResult, cast, asObj, asSoftStr, forProp, encodeJson } from "plgg";

// A 2xx or non-2xx both come back as a successful HttpResponse:
const result = await get("https://api.example.com/users/7");

pipe(
  result,
  matchResult(
    (err) => console.error("transport failed:", err),       // NetworkError only
    (res) => pipe(                                            // any HTTP status
      res,
      decodeJsonBody((v) => cast(v, asObj, forProp("name", (x) => cast(x, asSoftStr)))),
      matchResult(
        (e) => console.log(`status ${res.status.content}, body not the expected shape`),
        (user) => console.log("user:", user),
      ),
    ),
  ),
);

// POST with a JSON body — encode with plgg's codec at the call site:
const body = encodeJson({ name: "Grace", email: "grace@x.io" });
// ...then post("https://api.example.com/users", { body, headers: { "content-type": "application/json" } })
```

### API

- `request(method, url, { headers?, query?, body? })` — the core call. All
  arguments are supplied at once (it is **not** a `pipe` step).
- `get` / `post` / `put` / `patch` / `del` — method conveniences over `request`
  (`del`, since `delete` is a reserved word).

All return `PromisedResult<HttpResponse, ClientError>`, where
`ClientError = HttpError | NetworkError` — the shared `HttpError` vocabulary from
`plgg-http`, widened with the client-only `NetworkError`.

- `decodeJsonBody(as)(response)` — read the text body, `decodeJson`, then run a
  `cast`-based parser; the whole chain is a `Result<T, InvalidError>`.

## Failure policy

This is the central contract, by design:

- **A non-2xx status is a valid response, not an error.** `404`, `500`, etc.
  come back as `Ok(HttpResponse)`; the caller inspects `response.status` and
  decides. The client never guesses what a status "means" for your domain.
- **Only a transport/build failure is an error.** A DNS failure, a refused
  connection, a malformed URL, or a body that cannot be read folds to
  `Err(NetworkError)` — there is no HTTP response in that case.

## The seam

The Web platform types live in exactly one module
([`src/Http/usecase/seam.ts`](src/Http/usecase/seam.ts)):

- `toFetchRequest(req): Request` — plgg `HttpRequest` → native `Request`.
- `fromFetchResponse(res): PromisedResult<HttpResponse, ClientError>` — native
  `Response` → plgg `HttpResponse` (or a `NetworkError` if the body read fails).

This mirrors the router's seam (`toHttpRequest`/`toNativeResponse`) in the
opposite direction; the HTTP *model* (`HttpRequest`, `HttpResponse`,
`HttpStatus`, `Method`, `ResponseBody`) is reused, keeping client and server
symmetric.

## Out of scope (POC)

Retries, interceptors/middleware, streaming response bodies, auth/cookie flows,
and request cancellation are intentionally omitted.

## Example

A runnable example (a `GET` and a `POST` against the `plgg-server` example
server) lives in [`example.ts`](example.ts):

```bash
npx tsx packages/plgg-server/example.ts   # terminal 1: start the server
npx tsx packages/plgg-fetch/example.ts   # terminal 2: run the client
```

## Develop

```bash
scripts/tsc-plgg-fetch.sh     # type-check
scripts/test-plgg-fetch.sh    # type-check + tests
```
