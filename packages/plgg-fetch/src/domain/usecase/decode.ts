import {
  Result,
  SoftStr,
  InvalidError,
  invalidError,
  ok,
  err,
  pipe,
  chainResult,
  decodeJson,
} from "plgg";
import {
  HttpResponse,
  ResponseBody,
} from "plgg-http";

/**
 * Narrows a {@link ResponseBody} to its text. The client seam only ever
 * produces a text body, but the reused router type also admits bytes/stream
 * variants, so a non-text body is a typed failure rather than an `as`.
 */
const asText = (
  body: ResponseBody,
): Result<SoftStr, InvalidError> =>
  typeof body === "string"
    ? ok(body)
    : err(
        invalidError({
          message: "response body is not text",
        }),
      );

/**
 * Decodes a JSON response body into a typed value, plgg-style: read the text,
 * `decodeJson`, then run the caller's `cast`-based parser. Each step is a
 * `Result`, so a non-text body, a JSON syntax error, or a shape mismatch all
 * surface as an {@link InvalidError} without throwing.
 *
 * Data-last: `pipe(response, decodeJsonBody(asMyType))`.
 */
export const decodeJsonBody =
  <T>(as: (value: unknown) => Result<T, InvalidError>) =>
  (response: HttpResponse): Result<T, InvalidError> =>
    pipe(
      asText(response.body),
      chainResult(decodeJson),
      chainResult(as),
    );

/**
 * Narrows a {@link ResponseBody} to its finite `Bytes`. A body read as text or
 * stream is a typed failure rather than an `as`.
 */
const asBytes = (
  body: ResponseBody,
): Result<Uint8Array, InvalidError> =>
  typeof body !== "string" &&
  body.__tag === "Bytes"
    ? ok(body.content)
    : err(
        invalidError({
          message: "response body is not bytes",
        }),
      );

/**
 * Narrows a {@link ResponseBody} to its `Stream` of byte chunks.
 */
const asStream = (
  body: ResponseBody,
): Result<
  AsyncIterable<Uint8Array>,
  InvalidError
> =>
  typeof body !== "string" &&
  body.__tag === "Stream"
    ? ok(body.content)
    : err(
        invalidError({
          message: "response body is not a stream",
        }),
      );

/**
 * Reads a text response body — the value form of the text narrow, for a
 * `readAs: "text"` (default) call.
 */
export const readText = (
  response: HttpResponse,
): Result<SoftStr, InvalidError> =>
  asText(response.body);

/**
 * Reads a binary response body as raw bytes — for a `readAs: "bytes"` call
 * (an image, audio, an octet-stream). A non-bytes body is an
 * {@link InvalidError}, never a thrown cast.
 */
export const readBytes = (
  response: HttpResponse,
): Result<Uint8Array, InvalidError> =>
  asBytes(response.body);

/**
 * Reads a streamed response body as an incremental sequence of byte chunks —
 * for a `readAs: "stream"` call (served-events, a large download consumed
 * chunk-by-chunk). A non-stream body is an {@link InvalidError}.
 */
export const readStream = (
  response: HttpResponse,
): Result<
  AsyncIterable<Uint8Array>,
  InvalidError
> => asStream(response.body);
