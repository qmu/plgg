/**
 * plgg-web example — a small runnable server.
 *
 * Run it:
 *   npx tsx src/plgg-web/example.ts
 * then:
 *   curl localhost:3000/
 *   curl localhost:3000/users/7
 *   curl "localhost:3000/search?q=plgg"
 *   curl -X POST localhost:3000/echo -d 'hello, plgg'
 *   curl -i localhost:3000/missing        # -> 404
 *
 * The whole app is built the plgg way — a `pipe` of data-last `Web => Web`
 * transformers, not a method chain. Handlers return
 * `PromisedResult<HttpResponse, HttpError>`, lookups return `Option`, and
 * errors are values (`err(notFound(...))`) rather than thrown exceptions.
 */
import {
  web,
  use,
  get,
  post,
  toFetch,
  serve,
  param,
  query,
  textResponse,
  jsonResponse,
  notFound,
} from "plgg-web/index";
import { pipe, ok, mapOption, getOr, okOr } from "plgg";

const app = pipe(
  web(),

  // Onion-model middleware: log the method/path, then run the rest of the
  // chain. It returns the same `Result` a handler does.
  use(async (c, next) => {
    console.log(`-> ${c.req.method} ${c.req.path}`);
    return next();
  }),

  // A plain text response — builders are standalone, not methods on `c`.
  get("/", async () =>
    pipe("Hello, plgg-web!", textResponse, ok),
  ),

  // A path param. `pipe(c, param("id"))` yields `Option<SoftStr>`; build the body
  // with `mapOption`, then `okOr` turns a missing param into an `HttpError`
  // value — no `isSome` branch, no `.content` reach-in, no thrown exception.
  get("/users/:id", async (c) =>
    pipe(
      c,
      param("id"),
      mapOption((id) => jsonResponse({ id })),
      okOr(notFound(c.req.path)),
    ),
  ),

  // A query string. One flat pipeline: read the Option, transform the Some,
  // supply the None case, then build the response and lift it into `Result` —
  // `textResponse` and `ok` are just the last two steps.
  get("/search", async (c) =>
    pipe(
      c,
      query("q"),
      mapOption((q) => `searching: ${q}`),
      getOr("no query"),
      textResponse,
      ok,
    ),
  ),

  // The request body is a `SoftStr` on `c.req.body`.
  post("/echo", async (c) =>
    pipe(
      jsonResponse({ received: c.req.body }, 201),
      ok,
    ),
  ),
);

// `toFetch` is the node:http seam — Web Request/Response live only past here.
pipe(
  app,
  toFetch,
  serve({ port: 3000 }, () =>
    console.log("listening on http://localhost:3000"),
  ),
);
