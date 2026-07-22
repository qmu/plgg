/**
 * The plgg-fetch vendor boundary (anti-corruption layer) —
 * **the ONLY place this package touches the Web `fetch`
 * platform** (`fetch`, `Request`, `Response`, `Headers`,
 * `URL`, `RequestInit`). Every public function here exchanges
 * only plgg types and domain types (`HttpRequest` /
 * `HttpResponse` / `ClientError`), so the domain calls
 * {@link sendRequest} without ever seeing a Web type and any
 * vendor is swappable behind this file. Platform failures are
 * folded into value-level {@link ClientError}s, never thrown
 * across the seam.
 */
import {
  PromisedResult,
  Result,
  SoftStr,
  Dict,
  ok,
  err,
  pipe,
  matchOption,
  matchResult,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  ResponseBody,
  Method,
  statusOf,
  bytesBody,
  streamBody,
} from "plgg-http";
import {
  ClientError,
  networkError,
  redirectError,
} from "plgg-fetch/domain/model/ClientError";
import {
  ReadAs,
  Transport,
} from "plgg-fetch/domain/model/Transport";
import {
  Multipart,
  MultipartPart,
} from "plgg-fetch/domain/model/Multipart";

/**
 * The zero-config transport: no timeout, a text read, no multipart body — the
 * default for a plain call and the existing one-arg callers/tests.
 */
const noTransport: Transport = {
  timeoutMs: undefined,
  readAs: undefined,
  multipart: undefined,
};

/**
 * Extracts a human-readable message from an unknown thrown value.
 */
export const messageOf = (
  error: unknown,
): SoftStr =>
  error instanceof Error
    ? error.message
    : String(error);

/**
 * Whether a request method may carry a body. `GET`/`HEAD` must not (the
 * `Request` constructor throws otherwise), and an empty body is omitted.
 */
const hasBody = (
  method: Method,
  body: SoftStr,
): boolean =>
  body !== "" &&
  method !== "GET" &&
  method !== "HEAD";

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
 * Encodes a plgg-native {@link Multipart} body into a native `FormData` — the
 * one place the platform `FormData`/`Blob` types are touched. `FormData.append`
 * is an imperative native API (an irreducible seam), so the parts are folded
 * onto a fresh instance; a file part becomes a `Blob` (typed when the part
 * declares a `contentType`). `fetch` then sets `content-type` with the
 * boundary, so the caller must NOT set one itself.
 */
const toFormData = (parts: Multipart): FormData => {
  const form = new FormData();
  parts.forEach((part: MultipartPart): void => {
    if (part.kind === "field") {
      form.append(part.name, part.value);
    } else {
      form.append(
        part.name,
        // Copy into a fresh ArrayBuffer-backed view: a
        // `Uint8Array<ArrayBufferLike>` is not a `BlobPart`
        // (it could be shared-memory backed), and this is
        // the no-`as` way to hand the bytes to `Blob`.
        matchOption(
          (): Blob =>
            new Blob([new Uint8Array(part.bytes)]),
          (type: SoftStr): Blob =>
            new Blob([new Uint8Array(part.bytes)], {
              type,
            }),
        )(part.contentType),
        part.filename,
      );
    }
  });
  return form;
};

/**
 * Builds the native `RequestInit`. A `timeoutMs` becomes an
 * `AbortSignal.timeout` (the round-trip aborts, folding to a `NetworkError`);
 * a `multipart` transport body supersedes the text `body`; otherwise the text
 * `body` is included only when the method permits it (avoiding `undefined`
 * under exactOptionalPropertyTypes).
 */
const toRequestInit = (
  request: HttpRequest,
  transport: Transport,
): RequestInit => {
  const base: RequestInit = {
    method: request.method,
    headers: new Headers({ ...request.headers }),
    // never auto-follow: a 3xx must not silently re-send custom auth headers to
    // the redirect target. A redirect surfaces as a typed RedirectError instead.
    redirect: "manual",
    ...(transport.timeoutMs !== undefined
      ? {
          signal: AbortSignal.timeout(
            transport.timeoutMs,
          ),
        }
      : {}),
  };
  return transport.multipart !== undefined
    ? { ...base, body: toFormData(transport.multipart) }
    : hasBody(request.method, request.body)
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
  transport: Transport = noTransport,
): Request =>
  pipe(
    new URL(request.path),
    (url) => withQuery(url, request.query),
    (url) =>
      new Request(
        url,
        toRequestInit(request, transport),
      ),
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
 * only a failed body read folds to a {@link NetworkError}. A redirect (opaque
 * under the `manual` policy) folds to a {@link RedirectError} — never followed.
 */
/**
 * Adapts a native `ReadableStream` to a plgg-native `AsyncGenerator` of byte
 * chunks — the lazy, incremental read behind a `Stream` body. The reader loop
 * is an irreducible imperative seam: pull until `done`, releasing the lock
 * even on an early break. A `null` body (no response body) yields nothing.
 */
async function* streamChunks(
  stream: ReadableStream<Uint8Array> | null,
): AsyncGenerator<Uint8Array> {
  if (stream === null) {
    return;
  }
  const reader = stream.getReader();
  try {
    // Native reader loop — an irreducible imperative seam. The discriminated
    // read result narrows `value` to a chunk under `!done`, so no separate
    // (uncoverable) undefined guard is needed.
    for (
      let result = await reader.read();
      !result.done;
      result = await reader.read()
    ) {
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Reads a native `Response` body into a plgg-native {@link ResponseBody} per
 * the requested {@link ReadAs}: text (a `SoftStr`), bytes (a finite `Bytes`),
 * or a lazy `Stream`. A failed text/bytes read folds to a {@link NetworkError};
 * a stream is handed back unread, so its consumer folds any mid-stream failure.
 */
const readResponseBody = (
  response: Response,
  readAs: ReadAs,
): PromisedResult<ResponseBody, ClientError> =>
  readAs === "bytes"
    ? response.arrayBuffer().then(
        (
          buf: ArrayBuffer,
        ): Result<ResponseBody, ClientError> =>
          ok(bytesBody(new Uint8Array(buf))),
        (
          error: unknown,
        ): Result<ResponseBody, ClientError> =>
          err(networkError(messageOf(error))),
      )
    : readAs === "stream"
      ? Promise.resolve(
          ok(
            streamBody(
              streamChunks(response.body),
            ),
          ),
        )
      : response.text().then(
          (
            body: string,
          ): Result<ResponseBody, ClientError> =>
            ok(body),
          (
            error: unknown,
          ): Result<ResponseBody, ClientError> =>
            err(networkError(messageOf(error))),
        );

export const fromFetchResponse = (
  response: Response,
  readAs: ReadAs = "text",
): PromisedResult<HttpResponse, ClientError> =>
  response.type === "opaqueredirect"
    ? Promise.resolve(
        err(
          redirectError(
            "response was a redirect; not followed (manual redirect policy)",
          ),
        ),
      )
    : readResponseBody(response, readAs).then(
        matchResult(
          (
            e: ClientError,
          ): Result<HttpResponse, ClientError> =>
            err(e),
          (
            body: ResponseBody,
          ): Result<HttpResponse, ClientError> =>
            ok({
              status: statusOf(response.status),
              headers: toResponseHeaders(
                response.headers,
              ),
              body,
            }),
        ),
      );

/**
 * Send a plgg-native {@link HttpRequest} over the network and
 * return the response as a value — the one domain-facing
 * entry of this vendor. Builds the native `Request`
 * ({@link toFetchRequest}), runs `fetch` (never auto-following
 * a redirect), and folds the native `Response` back to a
 * domain {@link HttpResponse} ({@link fromFetchResponse}); a
 * malformed URL or a transport failure folds to a
 * {@link NetworkError}. The signature is domain-only
 * (`HttpRequest` in, `HttpResponse`/`ClientError` out) — the
 * `fetch`/`Request`/`Response` handling stays confined here,
 * so the domain's `request` never references a Web type.
 */
export const sendRequest = (
  request: HttpRequest,
  transport: Transport = noTransport,
): PromisedResult<HttpResponse, ClientError> =>
  Promise.resolve(request)
    .then((req: HttpRequest): Promise<Response> =>
      fetch(toFetchRequest(req, transport)),
    )
    .then(
      (response: Response) =>
        fromFetchResponse(
          response,
          transport.readAs === undefined
            ? "text"
            : transport.readAs,
        ),
      (
        error: unknown,
      ): Result<HttpResponse, ClientError> =>
        err(networkError(messageOf(error))),
    );
