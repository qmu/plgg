import {
  PromisedResult,
  Result,
  SoftStr,
  Dict,
  err,
  none,
  fromNullable,
  getOr,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  Method,
} from "plgg-server";
import {
  ClientError,
  networkError,
} from "plgg-fetch/Http/model/ClientError";
import {
  toFetchRequest,
  fromFetchResponse,
  messageOf,
} from "plgg-fetch/Http/usecase/seam";

/**
 * Per-call request options. `query` is merged onto the URL, `headers` are sent
 * as-is, and `body` is the (already-encoded) request payload — for JSON, encode
 * with plgg's `encodeJson` at the call site and set a `content-type` header.
 */
export type RequestOptions = Readonly<{
  headers?: Dict<string, SoftStr>;
  query?: Dict<string, SoftStr>;
  body?: SoftStr;
}>;

/**
 * Defaults an optional value, plgg-style (no `??`).
 */
const orElse =
  <T>(fallback: T) =>
  (value: T | undefined): T =>
    getOr(fallback)(fromNullable(value));

/**
 * Assembles a plgg-native {@link HttpRequest} from the call arguments. The
 * absolute URL lives in `path`; client requests have no route `params` and the
 * text path leaves `bytes` empty.
 */
const buildHttpRequest = (
  method: Method,
  url: SoftStr,
  options?: RequestOptions,
): HttpRequest => ({
  method,
  path: url,
  query: orElse<Dict<string, SoftStr>>({})(
    options?.query,
  ),
  headers: orElse<Dict<string, SoftStr>>({})(
    options?.headers,
  ),
  params: {},
  body: orElse("")(options?.body),
  bytes: none(),
});

/**
 * Performs an HTTP request and returns the response as a value.
 *
 * All arguments are supplied in one call (this is not a `pipe` step). Building
 * the native `Request` and `fetch` run inside the promise chain, so a malformed
 * URL or a transport failure folds to a {@link NetworkError}; any HTTP status —
 * 2xx or not — comes back as a successful {@link HttpResponse} for the caller to
 * inspect.
 */
export const request = (
  method: Method,
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  Promise.resolve(buildHttpRequest(method, url, options))
    .then((req: HttpRequest): Promise<Response> =>
      fetch(toFetchRequest(req)),
    )
    .then(
      (response: Response) =>
        fromFetchResponse(response),
      (error: unknown): Result<HttpResponse, ClientError> =>
        err(networkError(messageOf(error))),
    );

/**
 * `GET` convenience — see {@link request}.
 */
export const get = (
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  request("GET", url, options);

/**
 * `POST` convenience — see {@link request}.
 */
export const post = (
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  request("POST", url, options);

/**
 * `PUT` convenience — see {@link request}.
 */
export const put = (
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  request("PUT", url, options);

/**
 * `PATCH` convenience — see {@link request}.
 */
export const patch = (
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  request("PATCH", url, options);

/**
 * `DELETE` convenience (`del`, since `delete` is reserved) — see {@link request}.
 */
export const del = (
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  request("DELETE", url, options);
