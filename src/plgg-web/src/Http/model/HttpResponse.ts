import { Box, SoftStr, Dict, box } from "plgg";
import {
  HttpStatus,
  statusOf,
} from "plgg-web/index";

/**
 * A plgg-native response body. Text stays a bare `SoftStr` so existing handlers
 * and the text builders are unchanged; binary and streamed bodies are tagged
 * `Box` variants. The platform `BodyInit`/`ReadableStream` types appear only at
 * the serving seam ({@link toNativeResponse}/`serve`), never in the model — a
 * stream is represented as an `AsyncIterable<Uint8Array>`.
 */
export type ResponseBody =
  | SoftStr
  | Box<"Bytes", Uint8Array>
  | Box<"Stream", AsyncIterable<Uint8Array>>;

/**
 * Tags a finite byte body.
 */
export const bytesBody = (
  data: Uint8Array,
): Box<"Bytes", Uint8Array> => box("Bytes")(data);

/**
 * Tags a streamed body as a sequence of byte chunks.
 */
export const streamBody = (
  chunks: AsyncIterable<Uint8Array>,
): Box<"Stream", AsyncIterable<Uint8Array>> =>
  box("Stream")(chunks);

/**
 * A plgg-native HTTP response: a branded status, a header dictionary, and a
 * body that is text, bytes, or a stream. Conversion to a Web-standard
 * `Response` happens only at the serving seam.
 */
export type HttpResponse = Readonly<{
  status: HttpStatus;
  headers: Dict<string, SoftStr>;
  body: ResponseBody;
}>;

/**
 * Adds a default `content-type` unless one is already present.
 */
const withContentType = (
  headers: Dict<string, SoftStr>,
  contentType: SoftStr,
): Dict<string, SoftStr> =>
  "content-type" in headers
    ? headers
    : { ...headers, "content-type": contentType };

/**
 * Builds a `text/plain` response.
 */
export const textResponse = (
  body: SoftStr,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "text/plain; charset=utf-8",
  ),
  body,
});

/**
 * Builds a `text/html` response.
 */
export const htmlResponse = (
  body: SoftStr,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "text/html; charset=utf-8",
  ),
  body,
});

/**
 * Builds an `application/json` response by serializing `data`.
 */
export const jsonResponse = (
  data: unknown,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "application/json; charset=utf-8",
  ),
  body: JSON.stringify(data),
});

/**
 * Builds a binary response from a byte array, defaulting to
 * `application/octet-stream`. The known length lets the seam set
 * `Content-Length`.
 */
export const bytesResponse = (
  data: Uint8Array,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "application/octet-stream",
  ),
  body: bytesBody(data),
});

/**
 * Builds a streamed response from a sequence of byte chunks, defaulting to
 * `application/octet-stream`. The length is unknown, so the seam uses chunked
 * transfer.
 */
export const streamResponse = (
  chunks: AsyncIterable<Uint8Array>,
  status: number = 200,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: withContentType(
    headers,
    "application/octet-stream",
  ),
  body: streamBody(chunks),
});

/**
 * Builds a redirect response with a `location` header.
 */
export const redirectResponse = (
  location: SoftStr,
  status: number = 302,
  headers: Dict<string, SoftStr> = {},
): HttpResponse => ({
  status: statusOf(status),
  headers: { ...headers, location },
  body: "",
});
