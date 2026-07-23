import {
  Box,
  Bin,
  SoftStr,
  Result,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  box,
  ok,
  err,
  tryCatch,
} from "plgg";

/**
 * A branded base64url string (RFC 4648 §5,
 * unpadded). Branded (not a bare `SoftStr`) so a
 * raw string can never be mistaken for validated
 * base64url when assembling JWS segments.
 */
export type Base64UrlStr = Box<
  "Base64UrlStr",
  string
>;

const base64Url = refinedBrand<
  "Base64UrlStr",
  string,
  InvalidError
>(
  "Base64UrlStr",
  (v): v is string =>
    isSoftStr(v) && /^[A-Za-z0-9_-]*$/.test(v),
  () =>
    invalidError({
      message:
        "not a base64url string (charset [A-Za-z0-9_-], unpadded)",
    }),
);

/** Type guard for {@link Base64UrlStr}. */
export const isBase64UrlStr = base64Url.is;

/**
 * Validates an unknown value into a
 * {@link Base64UrlStr} at a boundary.
 */
export const asBase64UrlStr = base64Url.as;

/** The underlying string of a {@link Base64UrlStr}. */
export const base64UrlString = base64Url.unwrap;

const toBinaryString = (bytes: Bin): string => {
  // Byte-buffer seam: chunked fromCharCode keeps
  // the argument count bounded, so large inputs
  // (RSA moduli, signatures) cannot overflow the
  // call stack the way a single spread would.
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x1000) {
    s += String.fromCharCode(
      ...bytes.subarray(i, i + 0x1000),
    );
  }
  return s;
};

/**
 * Encodes bytes as unpadded base64url. Total: the
 * output always qualifies for the brand (btoa
 * emits `[A-Za-z0-9+/=]` and the replacements map
 * onto the url-safe alphabet), so it is boxed
 * directly.
 */
export const encodeBase64Url = (
  bytes: Bin,
): Base64UrlStr =>
  box("Base64UrlStr")(
    btoa(toBinaryString(bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  );

/**
 * Decodes a {@link Base64UrlStr} back to bytes.
 * The one failure mode left after the brand's
 * charset check is an impossible length
 * (`length % 4 === 1`), which no encoder emits.
 */
export const decodeBase64Url = (
  value: Base64UrlStr,
): Result<Bin, InvalidError> => {
  const s = base64UrlString(value);
  if (s.length % 4 === 1) {
    return err(
      invalidError({
        message:
          "not a base64url payload (impossible length)",
      }),
    );
  }
  // atob is total here: the brand fixes the
  // charset and the check above excludes the one
  // impossible shape.
  const binary = atob(
    s
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        s.length + ((4 - (s.length % 4)) % 4),
        "=",
      ),
  );
  // Byte-buffer seam (mirrors plgg core Bin's
  // fromJsonReady loop).
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return ok(bytes);
};

/** UTF-8 bytes of a string. */
export const utf8Bytes = (s: SoftStr): Bin =>
  new TextEncoder().encode(s);

/**
 * A fresh `ArrayBuffer`-backed copy of the bytes
 * for `BufferSource`-typed seams — WebCrypto
 * rejects the `ArrayBufferLike` (possibly
 * shared) backing that the general `Bin` type
 * admits.
 */
export const toBufferSource = (
  b: Bin,
): Uint8Array<ArrayBuffer> => new Uint8Array(b);

/**
 * Decodes bytes as UTF-8, failing (instead of
 * silently substituting U+FFFD) on invalid
 * sequences.
 */
export const utf8String = (
  b: Bin,
): Result<SoftStr, InvalidError> =>
  tryCatch(
    (bytes: Bin): SoftStr =>
      new TextDecoder("utf-8", {
        fatal: true,
      }).decode(bytes),
    () =>
      invalidError({
        message: "bytes are not valid UTF-8",
      }),
  )(b);
