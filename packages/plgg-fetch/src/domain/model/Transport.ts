import { Multipart } from "plgg-fetch/domain/model/Multipart";

/**
 * How the response body is read back: `"text"` (the default — a `SoftStr`
 * body), `"bytes"` (a finite `Bytes` body, for images/audio/octet-stream), or
 * `"stream"` (an incremental `Stream` of byte chunks, for served-events). Read
 * the result with `decodeJsonBody` / `readText` / `readBytes` / `readStream`.
 */
export type ReadAs = "text" | "bytes" | "stream";

/**
 * The vendor-seam transport concerns of a call — the things that are NOT part
 * of the plgg-native `HttpRequest` HTTP message, so they are threaded to the
 * vendor alongside it: `timeoutMs` bounds the round-trip, `readAs` selects the
 * response read, `multipart` supplies a `multipart/form-data` body. Fields are
 * `| undefined` (not `?:`) so the domain can build the record unconditionally
 * under `exactOptionalPropertyTypes`.
 */
export type Transport = Readonly<{
  timeoutMs: number | undefined;
  readAs: ReadAs | undefined;
  multipart: Multipart | undefined;
}>;
