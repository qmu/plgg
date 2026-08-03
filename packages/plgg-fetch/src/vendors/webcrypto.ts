/**
 * The plgg-fetch **crypto** vendor boundary — the ONLY place
 * this package touches the Web Crypto platform
 * (`crypto.subtle`, `TextEncoder`). Every function here
 * exchanges only plgg types and byte arrays, so the signing
 * domain composes SHA-256 and HMAC-SHA256 without ever
 * naming a platform API, and any vendor is swappable behind
 * this file.
 *
 * Web Crypto is also the reason the signing surface is
 * async at all: `crypto.subtle` returns promises. It is a
 * platform capability, not a dependency — nothing is added
 * to package.json (vendor-neutrality).
 *
 * These functions **may reject**, and the domain's single
 * entry (`sigv4Sign`) folds that to a `Defect` through
 * `tryCatch` — the same arrangement `toFetchRequest` in the
 * fetch seam already uses ("may throw on a malformed URL —
 * callers wrap it"). Folding at each of the six steps
 * instead would thread an error arm through the whole
 * signing chain to describe one failure mode that a fixed
 * algorithm literal cannot actually reach.
 */
import { SoftStr } from "plgg";

/**
 * Encodes text as UTF-8 bytes. The one place `TextEncoder`
 * is named; SigV4 hashes and signs UTF-8 throughout.
 */
export const utf8Bytes = (
  text: SoftStr,
): Uint8Array => new TextEncoder().encode(text);

/**
 * Renders bytes as lowercase hex — the form every SigV4
 * digest and the final signature are carried in.
 */
export const toHex = (
  bytes: Uint8Array,
): SoftStr =>
  Array.from(bytes)
    .map((b: number): string =>
      b.toString(16).padStart(2, "0"),
    )
    .join("");

/**
 * Lowercase-hex SHA-256 of a UTF-8 string — the shape SigV4
 * uses for both the hashed payload and the hashed canonical
 * request.
 */
export const sha256Hex = (
  text: SoftStr,
): Promise<SoftStr> =>
  crypto.subtle
    // Copy into a fresh ArrayBuffer-backed view: a
    // `Uint8Array<ArrayBufferLike>` is not a `BufferSource`
    // (it could be shared-memory backed), and this is the
    // no-`as` way to hand the bytes to `subtle`.
    .digest(
      "SHA-256",
      new Uint8Array(utf8Bytes(text)),
    )
    .then((digest: ArrayBuffer): SoftStr =>
      toHex(new Uint8Array(digest)),
    );

/**
 * HMAC-SHA256 of a UTF-8 message under a raw byte key. The
 * SigV4 signing key is derived by chaining this four times,
 * so it returns raw bytes rather than hex.
 */
export const hmacSha256 = (
  key: Uint8Array,
  message: SoftStr,
): Promise<Uint8Array> =>
  crypto.subtle
    .importKey(
      "raw",
      new Uint8Array(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    .then((cryptoKey: CryptoKey) =>
      crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        new Uint8Array(utf8Bytes(message)),
      ),
    )
    .then(
      (signature: ArrayBuffer): Uint8Array =>
        new Uint8Array(signature),
    );
