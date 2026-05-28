/**
 * plgg-http-client demo — calls the full-stack example server's JSON API and
 * decodes the response into typed `Article`s.
 *
 * Run (in another terminal, after `npm run build` + `npm run serve`):
 *   npm run client            # = tsx src/client/main.ts
 *
 * A transport failure is a `NetworkError`; a non-2xx status is still a valid
 * `HttpResponse`; the body is decoded with `decodeJsonBody(asArticles)`. The
 * `ClientError` vocabulary is folded exhaustively by name with `match`.
 */
import {
  InvalidError,
  SoftStr,
  pipe,
  match,
  matchResult,
} from "plgg";
import {
  get,
  decodeJsonBody,
  ClientError,
  networkError$,
} from "plgg-http-client";
import {
  HttpResponse,
  notFound$,
  methodNotAllowed$,
  badRequest$,
  unsupported$,
  unauthorized$,
  forbidden$,
  statusError$,
  internalError$,
} from "plgg-server";
import {
  Article,
  asArticles,
} from "../modeling/Article";

const BASE = "http://localhost:3000";

/**
 * Folds the full `ClientError` vocabulary to a message — by named ADT pattern,
 * not tag strings — proving the client and server share one error model.
 */
const describeClientError = (
  error: ClientError,
): SoftStr =>
  match(error)(
    [
      networkError$(),
      (e) => `network error — ${e.content.message}`,
    ],
    [
      notFound$(),
      (e) => `not found — ${e.content.path}`,
    ],
    [
      methodNotAllowed$(),
      (e) =>
        `method not allowed; allowed: ${e.content.allowed.join(", ")}`,
    ],
    [
      badRequest$(),
      (e) => `bad request — ${e.content.message}`,
    ],
    [
      unsupported$(),
      (e) => `unsupported — ${e.content.message}`,
    ],
    [
      unauthorized$(),
      (e) => `unauthorized — ${e.content.message}`,
    ],
    [
      forbidden$(),
      (e) => `forbidden — ${e.content.message}`,
    ],
    [
      statusError$(),
      (e) =>
        `status ${e.content.status.content} — ${e.content.message}`,
    ],
    [
      internalError$(),
      (e) => `internal error — ${e.content.message}`,
    ],
  );

const main = async (): Promise<void> =>
  pipe(
    await get(`${BASE}/api/articles`),
    matchResult(
      (error: ClientError): void =>
        console.error(
          `request failed: ${describeClientError(error)}`,
        ),
      (response: HttpResponse): void =>
        pipe(
          response,
          decodeJsonBody(asArticles),
          matchResult(
            (e: InvalidError): void =>
              console.error(
                `decode failed: ${e.message}`,
              ),
            (
              articles: ReadonlyArray<Article>,
            ): void =>
              console.log(
                `got ${articles.length} article(s):`,
                articles.map((a) => a.name),
              ),
          ),
        ),
    ),
  );

main();
