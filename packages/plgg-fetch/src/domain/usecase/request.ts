import {
  PromisedResult,
  SoftStr,
  Dict,
  none,
  fromNullable,
  getOr,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  Method,
} from "plgg-http";
import { ClientError } from "plgg-fetch/domain/model/ClientError";
import { Multipart } from "plgg-fetch/domain/model/Multipart";
import {
  ReadAs,
  Transport,
} from "plgg-fetch/domain/model/Transport";
import { sendRequest } from "plgg-fetch/vendors/fetch";

/**
 * Per-call request options. `query` is merged onto the URL, `headers` are sent
 * as-is, and `body` is the (already-encoded) text payload — for JSON, encode
 * with plgg's `encodeJson` at the call site and set a `content-type` header.
 *
 * Transport concerns (not part of the HTTP message): `timeoutMs` bounds the
 * round-trip (the request aborts, folding to a `NetworkError`); `readAs`
 * selects how the response body is read; `multipart` supplies a
 * `multipart/form-data` body that supersedes `body`.
 */
export type RequestOptions = Readonly<{
  headers?: Dict<string, SoftStr>;
  query?: Dict<string, SoftStr>;
  body?: SoftStr;
  timeoutMs?: number;
  readAs?: ReadAs;
  multipart?: Multipart;
}>;

/**
 * Splits the transport concerns out of {@link RequestOptions} — the vendor
 * seam handles these, they are not fields of the plgg-native `HttpRequest`.
 */
const transportOf = (
  options?: RequestOptions,
): Transport => ({
  timeoutMs: options?.timeoutMs,
  readAs: options?.readAs,
  multipart: options?.multipart,
});

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
 * All arguments are supplied in one call (this is not a `pipe` step). The
 * network round-trip is delegated to the vendor {@link sendRequest} — the sole
 * toucher of the Web `fetch` platform — so this domain use case handles only
 * plgg-native {@link HttpRequest}/{@link HttpResponse} values: a malformed URL
 * or a transport failure folds to a {@link NetworkError}, and any HTTP status —
 * 2xx or not — comes back as a successful {@link HttpResponse} for the caller
 * to inspect.
 */
export const request = (
  method: Method,
  url: SoftStr,
  options?: RequestOptions,
): PromisedResult<HttpResponse, ClientError> =>
  sendRequest(
    buildHttpRequest(method, url, options),
    transportOf(options),
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
