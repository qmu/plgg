# plgg-http

The **runtime-neutral HTTP model**, built from scratch on
[plgg](/packages/plgg/). Pure data and pure builders for
requests, responses, statuses, methods, and the HTTP
failure vocabulary — **no `node:http`, no `fetch`, no
DOM**. Its only runtime dependency is `plgg`.

## Writing an app with it

A request comes in, a response goes out — as one
[`pipe`](/concepts/composition). Lookups are
[`Option`](/concepts/option), failures are values matched
**by name**, and a response is just data you build:

```typescript
import { pipe, matchOption } from "plgg";
import {
  type HttpRequest,
  getParam,
  jsonResponse,
  statusOf,
  notFound,
  httpErrorToResponse,
} from "plgg-http";

const handle = (req: HttpRequest) =>
  pipe(
    getParam(req, "id"), // Option<SoftStr>
    matchOption(
      // absent → a 404 HttpError, turned into a response
      () => httpErrorToResponse(notFound("/users")),
      // present → 201 with a JSON body
      (id) => jsonResponse({ id }, statusOf(201)),
    ),
  );
```

Because it is just data with no platform globals, the same
model runs on a `node:http` server
([plgg-server](/packages/plgg-server)), in a browser client
([plgg-fetch](/packages/plgg-fetch)), or under SSR.

## Vocabulary

The model covers the whole wire vocabulary as pure plgg
data, grouped by concern:

- **method** — `Method` (a [`Box`](/concepts/tagged-data)
  union) with its `asMethod`/`isMethod` validators.
- **status** — `HttpStatus` (a validated `Box<"HttpStatus", number>`),
  built with `statusOf`.
- **request** — `HttpRequest`, with `Option`-returning
  field lookups (`getHeader`/`getQuery`/`getParam`/…).
- **response** — `HttpResponse` + `ResponseBody`
  (`SoftStr | Bytes | Stream`) and the `*Response`
  builders (`textResponse`/`jsonResponse`/…).
- **failure** — `HttpError` (a `Box` union) with named
  constructors (`notFound`/`badRequest`/…) and `$`-matchers
  (`notFound$()`), plus `httpErrorToResponse`.

Everything is pure plgg data: lookups are
[`Option`](/concepts/option), validation is
[`Result`](/concepts/result), unions are
[`Box`](/concepts/tagged-data), and failures are values
matched **by name**, never by tag string — with no
platform globals, so it imports safely on a server, in a
browser, or under SSR. The exact types and the full
builder/matcher list live in the `plgg-http` source.

## Why it exists

[plgg-server](/packages/plgg-server) and
[plgg-fetch](/packages/plgg-fetch) are **symmetric
peers** — both speak the same HTTP model. Since a peer
must not import a peer, the shared model is extracted
*below* both:

```
plgg ── plgg-http ─┬─ plgg-server
                   └─ plgg-fetch
```

This is the rule the repo follows: parallel-define small
clones, but **extract-below large shared vocabularies**.
The HTTP model is large and identical on both sides, so
it gets one home here.
