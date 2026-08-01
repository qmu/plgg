/**
 * The plgg-fetch **crypto** vendor boundary — the ONLY place
 * this package touches the Web Crypto platform
 * (`crypto.subtle`, `TextEncoder`, `atob`/`btoa`). Every
 * function here exchanges only plgg types and byte arrays,
 * so the signing domain composes RS256 and base64url without
 * ever naming a platform API, and any vendor is swappable
 * behind this file.
 *
 * Web Crypto is also the reason the signing surface is async
 * at all: `crypto.subtle` returns promises. It is a platform
 * capability, not a dependency — nothing is added to
 * package.json (vendor-neutrality).
 *
 * These functions **may reject** (a malformed PEM is the
 * realistic case), and the domain's entry folds that to a
 * `Defect` through `tryCatch` — the same arrangement
 * `toFetchRequest` in the fetch seam already uses ("may
 * throw on a malformed URL — callers wrap it"). Folding at
 * each step instead would thread an error arm through the
 * whole chain to describe one failure mode.
 */
import { SoftStr } from "plgg";

/**
 * Encodes text as UTF-8 bytes. The one place `TextEncoder`
 * is named; a JWT's header, claims and signature are all
 * taken over UTF-8.
 */
export const utf8Bytes = (
  text: SoftStr,
): Uint8Array => new TextEncoder().encode(text);

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
 * Decodes the base64 body of a PEM block into DER bytes.
 *
 * A service-account key arrives as PKCS#8 PEM (the
 * `-----BEGIN PRIVATE KEY-----` armour with wrapped base64
 * inside), and `crypto.subtle.importKey("pkcs8", …)` wants
 * the raw DER. Strips the armour lines and all whitespace —
 * including the `\n` that survives being read out of a JSON
 * key file — then base64-decodes.
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
      // Copy into a fresh ArrayBuffer-backed view: a
      // `Uint8Array<ArrayBufferLike>` is not a
      // `BufferSource` (it could be shared-memory backed),
      // and this is the no-`as` way to hand bytes to
      // `subtle`.
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
