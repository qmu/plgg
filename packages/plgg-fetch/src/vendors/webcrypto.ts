/**
 * The plgg-fetch **crypto** vendor boundary — the ONLY place
 * this package touches the Web Crypto platform
 * (`crypto.subtle`, `TextEncoder`, `atob`/`btoa`). Every
 * function here exchanges only plgg types and byte arrays,
 * so the signing domains compose SHA-256, HMAC-SHA256, RS256
 * and base64url without ever naming a platform API, and any
 * vendor is swappable behind this file.
 *
 * Two signing families share this seam — AWS SigV4 (hex
 * SHA-256 and a chained HMAC) and GCP's JWT-bearer grant
 * (base64url and RS256) — over one `utf8Bytes`, because both
 * hash and sign UTF-8 throughout.
 *
 * Web Crypto is also the reason both signing surfaces are
 * async at all: `crypto.subtle` returns promises. It is a
 * platform capability, not a dependency — nothing is added
 * to package.json (vendor-neutrality).
 *
 * These functions **may reject** (a malformed PEM is the
 * realistic case; the SigV4 side's algorithm literals are
 * fixed and cannot), and each domain's single entry
 * (`sigv4Sign`, `gcpAssertion`) folds that to a `Defect`
 * through `tryCatch` — the same arrangement `toFetchRequest`
 * in the fetch seam already uses ("may throw on a malformed
 * URL — callers wrap it"). Folding at each step instead
 * would thread an error arm through a whole signing chain to
 * describe one failure mode.
 */
import { SoftStr } from "plgg";

/**
 * Encodes text as UTF-8 bytes. The one place `TextEncoder`
 * is named; SigV4 hashes and signs UTF-8 throughout, and a
 * JWT's header, claims and signature are all taken over
 * UTF-8 too.
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
 * base64url of raw bytes: standard base64 with the URL
 * alphabet and no padding — the encoding every JWT segment
 * is carried in (RFC 7515 §2).
 */
export const toBase64Url = (
  bytes: Uint8Array,
): SoftStr =>
  btoa(
    Array.from(bytes)
      .map((b: number): string =>
        String.fromCharCode(b),
      )
      .join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/**
 * base64url of a UTF-8 string — the JWT header and claims
 * segments.
 */
export const textToBase64Url = (
  text: SoftStr,
): SoftStr => toBase64Url(utf8Bytes(text));

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

/**
 * Decodes the base64 body of a PEM block into DER bytes.
 *
 * A service-account key arrives as PKCS#8 PEM (the BEGIN /
 * END armour lines around wrapped base64), and
 * `crypto.subtle.importKey("pkcs8", …)` wants the raw DER.
 * Strips the armour lines and all whitespace — including the
 * `\n` that survives being read out of a JSON key file —
 * then base64-decodes.
 */
export const pemToDer = (
  pem: SoftStr,
): Uint8Array =>
  Uint8Array.from(
    atob(
      pem
        .replace(/-----[A-Z ]+-----/g, "")
        .replace(/\s+/g, ""),
    ),
    (c: string): number => c.charCodeAt(0),
  );

/**
 * Signs a UTF-8 message with **RS256**
 * (RSASSA-PKCS1-v1_5 over SHA-256) using a PKCS#8 PEM
 * private key, returning the raw signature bytes.
 *
 * RS256 is deterministic — the same key over the same input
 * always yields the same signature — which is what lets a
 * test check this against an independent implementation
 * rather than against itself.
 */
export const rs256Sign = (
  privateKeyPem: SoftStr,
  message: SoftStr,
): Promise<Uint8Array> =>
  crypto.subtle
    .importKey(
      "pkcs8",
      new Uint8Array(pemToDer(privateKeyPem)),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    )
    .then((key: CryptoKey) =>
      crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new Uint8Array(utf8Bytes(message)),
      ),
    )
    .then(
      (signature: ArrayBuffer): Uint8Array =>
        new Uint8Array(signature),
    );
