# plgg-http

The **runtime-neutral HTTP model**, built from scratch on
[plgg](/packages/plgg/). Pure data and pure builders for
requests, responses, statuses, methods, and the HTTP
failure vocabulary — **no `node:http`, no `fetch`, no
DOM**. Its only runtime dependency is `plgg`.

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

## The model

| Concern | Type / helpers |
|---------|----------------|
| method | `Method` (`Box` union) · `METHODS` · `isMethod` · `asMethod` |
| status | `HttpStatus = Box<"HttpStatus", number>` · `isHttpStatus` · `asHttpStatus` · `statusOf` |
| request | `HttpRequest` (pure data) · `withParams` · `getHeader` · `getQuery` · `getParam` · `getBytes` |
| response | `HttpResponse` · `ResponseBody` · `textResponse` · `htmlResponse` · `jsonResponse` · `bytesResponse` · `streamResponse` · `redirectResponse` |
| failure | `HttpError` (`Box` union) · `notFound`/`badRequest`/`unauthorized`/`forbidden`/`methodNotAllowed`/`unsupported`/`statusError`/`internalError` · matchers (`notFound$`/…) · `httpErrorToResponse` |

Everything is pure plgg data: lookups are
[`Option`](/concepts/option), validation is
[`Result`](/concepts/result), unions are
[`Box`](/concepts/tagged-data), and failures are values
matched **by name** (`notFound$()`), never by tag string.
`ResponseBody` is `SoftStr | Bytes | Stream`. There are
no platform globals, so the package imports safely on a
server, in a browser, or under SSR.
