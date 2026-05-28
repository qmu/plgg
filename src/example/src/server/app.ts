import {
  SoftStr,
  ok,
  pipe,
  proc,
  mapErr,
} from "plgg";
import {
  Web,
  web,
  get,
  jsonResponse,
  pageResponse,
  javascriptResponse,
  HttpError,
  internalError,
  badRequest,
} from "plgg-server";
import {
  Db,
  SqlError,
  sql,
  query,
  decodeRows,
} from "plgg-sql";
import { App } from "../App";
import {
  Article,
  asArticle,
} from "../modeling/Article";
import { compactRow } from "../db/open";

/**
 * The one place the app assigns status codes: a database failure is a 500, and
 * anything else (a row that fails `asArticle`) is a 400. Reads the structured
 * object-content `HttpError` vocabulary.
 */
const toHttpError = (error: Error): HttpError =>
  error instanceof SqlError
    ? internalError("database error")
    : badRequest(error.message);

/**
 * The wire shape of the article list is the raw (compacted) DB row — plain JSON
 * that is exactly `asArticle`'s input. The server never serializes the decoded
 * domain `Article` (its `memo: Option` is a `Box` that would not round-trip);
 * instead `asArticle` is applied at every *consumer* boundary: here for SSR, in
 * the browser hydrate, and in the plgg-http-client demo. One model, decoded
 * wherever data enters the domain.
 */
const ARTICLES_SQL = sql`SELECT id, createdAt, name, memo FROM articles ORDER BY id`;

/**
 * Builds the demo app. `GET /` decodes the rows to `Article`s and renders them
 * as a plgg-view SSR page (the same `App` the browser re-renders);
 * `GET /api/articles` returns the raw rows as JSON for consumers to decode; and
 * `GET /client.js` serves the CSR bundle. Every handler is one `proc` chain that
 * interleaves db + view steps and folds failures to `HttpError` at the edge.
 */
export const buildApp = (
  db: Db,
  clientBundle: SoftStr,
): Web =>
  pipe(
    web(),
    get("/", () =>
      proc(
        ARTICLES_SQL,
        query(db),
        (rows: ReadonlyArray<unknown>) =>
          ok(rows.map(compactRow)),
        decodeRows(asArticle),
        (articles: ReadonlyArray<Article>) =>
          pageResponse({
            title: "plgg full-stack demo",
            root: App({ articles }),
            clientEntry: "/client.js",
          }),
      ).then(mapErr(toHttpError)),
    ),
    get("/api/articles", () =>
      proc(
        ARTICLES_SQL,
        query(db),
        (rows: ReadonlyArray<unknown>) =>
          ok(rows.map(compactRow)),
        (rows: ReadonlyArray<unknown>) =>
          jsonResponse(rows),
      ).then(mapErr(toHttpError)),
    ),
    get("/client.js", async () =>
      ok(javascriptResponse(clientBundle)),
    ),
  );
