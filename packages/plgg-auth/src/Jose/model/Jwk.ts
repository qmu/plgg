import {
  Box,
  Result,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  cast,
  forProp,
  ok,
  err,
} from "plgg";
import {
  Base64UrlStr,
  asBase64UrlStr,
  base64UrlString,
} from "plgg-auth/Jose/model/Base64Url";

/**
 * A branded JWK key id. Branded (not a bare
 * `SoftStr`) so an arbitrary string can never be
 * mistaken for a validated key identifier when
 * wiring JWKS lookups.
 */
export type Kid = Box<"Kid", string>;

const kid = refinedBrand<
  "Kid",
  string,
  InvalidError
>(
  "Kid",
  (v): v is string =>
    isSoftStr(v) && v.length > 0,
  () =>
    invalidError({
      message: "a kid must be a non-empty string",
    }),
);

/** Type guard for {@link Kid}. */
export const isKid = kid.is;

/**
 * Validates an unknown value into a {@link Kid}
 * at a boundary.
 */
export const asKid = kid.as;

/** The underlying string of a {@link Kid}. */
export const kidString = kid.unwrap;

/**
 * An RSA public JWK (RFC 7517), narrowed to what
 * RS256 verification needs. `kid` is required:
 * this library always identifies keys by their
 * RFC 7638 thumbprint, so a keyless-id JWK is
 * unrepresentable.
 */
export type RsaPublicJwk = Readonly<{
  kty: "RSA";
  n: Base64UrlStr;
  e: Base64UrlStr;
  kid: Kid;
}>;

/**
 * An RSA private JWK with the full CRT parameter
 * set WebCrypto expects for import.
 */
export type RsaPrivateJwk = Readonly<{
  kty: "RSA";
  n: Base64UrlStr;
  e: Base64UrlStr;
  kid: Kid;
  d: Base64UrlStr;
  p: Base64UrlStr;
  q: Base64UrlStr;
  dp: Base64UrlStr;
  dq: Base64UrlStr;
  qi: Base64UrlStr;
}>;

const asRsaKty = (
  v: unknown,
): Result<"RSA", InvalidError> =>
  v === "RSA"
    ? ok("RSA")
    : err(
        invalidError({
          message: 'JWK "kty" must be "RSA"',
        }),
      );

/**
 * Validates an unknown value into an
 * {@link RsaPublicJwk} at a boundary (a fetched
 * JWKS document, a stored key row).
 */
export const asRsaPublicJwk = (
  v: unknown,
): Result<RsaPublicJwk, InvalidError> =>
  cast(
    v,
    forProp("kty", asRsaKty),
    forProp("n", asBase64UrlStr),
    forProp("e", asBase64UrlStr),
    forProp("kid", asKid),
  );

/**
 * Validates an unknown value into an
 * {@link RsaPrivateJwk} at a boundary.
 */
export const asRsaPrivateJwk = (
  v: unknown,
): Result<RsaPrivateJwk, InvalidError> =>
  cast(
    v,
    forProp("kty", asRsaKty),
    forProp("n", asBase64UrlStr),
    forProp("e", asBase64UrlStr),
    forProp("kid", asKid),
    forProp("d", asBase64UrlStr),
    forProp("p", asBase64UrlStr),
    forProp("q", asBase64UrlStr),
    forProp("dp", asBase64UrlStr),
    forProp("dq", asBase64UrlStr),
    forProp("qi", asBase64UrlStr),
  );

/**
 * The WebCrypto algorithm this library signs and
 * verifies with. RS256 is OIDC's mandatory-to-
 * implement ID-token algorithm.
 */
export const rs256Params = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
};

/**
 * The plain JSON shape of a public key for
 * WebCrypto `importKey("jwk", …)` and for JWKS
 * serving.
 */
export const publicJwkJson = (
  key: RsaPublicJwk,
): {
  kty: string;
  n: string;
  e: string;
} => ({
  kty: "RSA",
  n: base64UrlString(key.n),
  e: base64UrlString(key.e),
});

/**
 * The plain JSON shape of a private key for
 * WebCrypto `importKey("jwk", …)`.
 */
export const privateJwkJson = (
  key: RsaPrivateJwk,
): {
  kty: string;
  n: string;
  e: string;
  d: string;
  p: string;
  q: string;
  dp: string;
  dq: string;
  qi: string;
} => ({
  ...publicJwkJson(key),
  d: base64UrlString(key.d),
  p: base64UrlString(key.p),
  q: base64UrlString(key.q),
  dp: base64UrlString(key.dp),
  dq: base64UrlString(key.dq),
  qi: base64UrlString(key.qi),
});
