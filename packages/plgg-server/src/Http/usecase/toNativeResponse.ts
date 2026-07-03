import {
  HttpResponse,
  ResponseBody,
} from "plgg-server/index";

/**
 * Adapts a plgg-native stream (`AsyncIterable<Uint8Array>`) into a Web-standard
 * `ReadableStream` — the only place the platform stream type appears.
 */
const toReadableStream = (
  chunks: AsyncIterable<Uint8Array>,
): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start: async (controller) => {
      for await (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

/**
 * Copies a byte view into a standalone `ArrayBuffer` — a `BodyInit` the
 * `Response` constructor accepts without depending on the `Uint8Array` buffer
 * generic.
 */
const toArrayBuffer = (
  data: Uint8Array,
): ArrayBuffer => {
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(data);
  return copy;
};

/**
 * Returns the headers with `Content-Length` set (unless already present).
 */
const withContentLength = (
  headers: Headers,
  length: number,
): Headers =>
  headers.has("content-length")
    ? headers
    : (headers.set(
        "content-length",
        String(length),
      ),
      headers);

/**
 * Builds the native `Response` for one {@link ResponseBody} variant: text and
 * bytes carry a known `Content-Length`; a stream is chunked.
 */
const respond = (
  body: ResponseBody,
  status: number,
  headers: Headers,
): Response =>
  typeof body === "string"
    ? new Response(body, { status, headers })
    : body.__tag === "Bytes"
      ? new Response(
          toArrayBuffer(body.content),
          {
            status,
            headers: withContentLength(
              headers,
              body.content.byteLength,
            ),
          },
        )
      : new Response(
          toReadableStream(body.content),
          {
            status,
            headers,
          },
        );

/**
 * Copies the header `Dict` into native `Headers`. The `set-cookie` entry is
 * the one header that cannot be comma-joined, so plgg-http's `withSetCookie`
 * folds multiple cookies into it on `"\n"` — split here and `append` each line
 * as its own `Set-Cookie` header.
 */
const toHeaders = (
  dict: Readonly<Record<string, string>>,
): Headers => {
  // Imperative seam: Headers is a mutable platform object.
  const headers = new Headers();
  for (const [name, value] of Object.entries(
    dict,
  )) {
    if (name === "set-cookie") {
      for (const line of value.split("\n")) {
        headers.append("set-cookie", line);
      }
    } else {
      headers.set(name, value);
    }
  }
  return headers;
};

/**
 * Converts a plgg-native {@link HttpResponse} into a Web-standard `Response`.
 *
 * The second seam function: the branded status is unwrapped to a number, the
 * header `Dict` is copied into native `Headers` (multi-`Set-Cookie` aware),
 * and the body union is folded into a `BodyInit` (string, bytes, or a
 * `ReadableStream`) here, at the edge.
 */
export const toNativeResponse = (
  response: HttpResponse,
): Response =>
  respond(
    response.body,
    response.status.content,
    toHeaders(response.headers),
  );
