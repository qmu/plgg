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
