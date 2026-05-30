import {
  PromisedResult,
  Result,
  SoftStr,
  Dict,
  ok,
  err,
  pipe,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  Method,
  statusOf,
} from "plgg-http";
import {
  ClientError,
  networkError,
} from "plgg-fetch/Http/model/ClientError";

/**
 * Extracts a human-readable message from an unknown thrown value.
 */
export const messageOf = (error: unknown): SoftStr =>
  error instanceof Error ? error.message : String(error);

/**
 * Whether a request method may carry a body. `GET`/`HEAD` must not (the
 * `Request` constructor throws otherwise), and an empty body is omitted.
 */
const hasBody = (
  method: Method,
  body: SoftStr,
): boolean =>
  body !== "" && method !== "GET" && method !== "HEAD";

/**
 * Folds the plgg `query` {@link Dict} back onto a copy of the URL's search
 * params — the inverse of the router seam, which split a native URL into
 * `path` + `query`. `URLSearchParams.set` is an imperative native API (an
 * irreducible seam), so this mutates a fresh `URL`, never the caller's.
 */
const withQuery = (
  url: URL,
  query: Dict<string, SoftStr>,
): URL => {
  const next = new URL(url.href);
  Object.entries(query).forEach(([key, value]) =>
    next.searchParams.set(key, value),
  );
  return next;
};

/**
 * Builds the native `RequestInit`, including `body` only when the method
 * permits it (avoids passing `undefined` under exactOptionalPropertyTypes).
 */
const toRequestInit = (
  request: HttpRequest,
): RequestInit => {
  const base: RequestInit = {
    method: request.method,
    headers: new Headers({ ...request.headers }),
  };
  return hasBody(request.method, request.body)
    ? { ...base, body: request.body }
    : base;
};

/**
 * Converts a plgg-native {@link HttpRequest} into a Web-standard `Request`.
 *
 * One of the two seam functions where native Web types are touched. The client
 * carries the absolute URL in `path` (the server's `path` is the pathname only)
 * and merges `query` onto its search params; headers are copied out of the
 * plgg `Dict`. May throw on a malformed URL — callers wrap it (see `request`).
 */
export const toFetchRequest = (
  request: HttpRequest,
): Request =>
  pipe(
    new URL(request.path),
    (url) => withQuery(url, request.query),
    (url) => new Request(url, toRequestInit(request)),
  );

/**
 * Copies native `Headers` into a lowercased plgg `Dict`.
 */
const toResponseHeaders = (
  headers: Headers,
): Dict<string, SoftStr> =>
  Object.fromEntries(
    [...headers].map(
      ([key, value]): [string, string] => [
        key.toLowerCase(),
        value,
      ],
    ),
  );

/**
 * Converts a Web-standard `Response` into a plgg-native {@link HttpResponse}.
 *
 * The second seam function: the status is lifted through `statusOf` (always in
 * range), headers are copied into a `Dict`, and the body is read as text. A
 * non-2xx status is **not** an error here — it yields a valid `HttpResponse`;
 * only a failed body read folds to a {@link NetworkError}.
 */
export const fromFetchResponse = (
  response: Response,
): PromisedResult<HttpResponse, ClientError> =>
  response.text().then(
    (body: string): Result<HttpResponse, ClientError> =>
      ok({
        status: statusOf(response.status),
        headers: toResponseHeaders(response.headers),
        body,
      }),
    (error: unknown): Result<HttpResponse, ClientError> =>
      err(networkError(messageOf(error))),
  );
