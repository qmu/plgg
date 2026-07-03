import {
  SoftStr,
  Result,
  box,
  mapResult,
} from "plgg";
import {
  Base64UrlStr,
  base64UrlString,
  encodeBase64Url,
  utf8Bytes,
  toBufferSource,
} from "plgg-auth/Jose/model/Base64Url";
import { Kid } from "plgg-auth/Jose/model/Jwk";
import {
  JoseError,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";

/**
 * The two members an RSA JWK thumbprint hashes
 * over. Structurally satisfied by both
 * `RsaPublicJwk` and `RsaPrivateJwk`, and by
 * freshly exported material that has no `kid`
 * yet.
 */
export type RsaKeyMaterial = Readonly<{
  n: Base64UrlStr;
  e: Base64UrlStr;
}>;

const canonicalJson = (
  key: RsaKeyMaterial,
): SoftStr =>
  // RFC 7638 §3: the required RSA members in
  // lexicographic order, no whitespace. Total
  // shape (two strings), so the throwing
  // JSON.stringify needs no lifting.
  JSON.stringify({
    e: base64UrlString(key.e),
    kty: "RSA",
    n: base64UrlString(key.n),
  });

/**
 * Computes the RFC 7638 SHA-256 JWK thumbprint
 * of an RSA key as its {@link Kid} — the one way
 * this library names keys.
 */
export const thumbprintKid = (
  key: RsaKeyMaterial,
): Promise<Result<Kid, JoseError>> =>
  liftJose<ArrayBuffer>("KeyFailure")(() =>
    crypto.subtle.digest(
      "SHA-256",
      toBufferSource(
        utf8Bytes(canonicalJson(key)),
      ),
    ),
  ).then(
    mapResult(
      (digest: ArrayBuffer): Kid =>
        // Non-empty by construction: a SHA-256
        // digest always encodes to 43 base64url
        // characters.
        box("Kid")(
          base64UrlString(
            encodeBase64Url(
              new Uint8Array(digest),
            ),
          ),
        ),
    ),
  );
