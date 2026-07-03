import { Str, Time, box, none } from "plgg";
import {
  Base64UrlStr,
  base64UrlString,
  encodeBase64Url,
  utf8Bytes,
} from "plgg-auth/Jose/model/Base64Url";
import {
  Kid,
  RsaPublicJwk,
  RsaPrivateJwk,
} from "plgg-auth/Jose/model/Jwk";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import { JwtClaims } from "plgg-auth/Jose/model/JwtClaims";
import {
  Jwks,
  jwks,
} from "plgg-auth/Jose/model/Jwks";
import { ValidateJwt } from "plgg-auth/Jose/usecase/validateJwt";
import { rfc7515A2 } from "plgg-auth/Jose/testkit/rfcVectors";

/**
 * Test-only total constructors over known-valid
 * fixture strings — direct boxing is safe here
 * because every value is pinned RFC material.
 */
export const b64 = (s: string): Base64UrlStr =>
  box("Base64UrlStr")(s);

export const str = (s: string): Str =>
  box("Str")(s);

export const kidOf = (s: string): Kid =>
  box("Kid")(s);

export const compactOf = (
  header: string,
  payload: string,
  signature: string,
): CompactJws =>
  box("CompactJws")(
    `${header}.${payload}.${signature}`,
  );

/** The RFC 7515 A.2 key pair with a fixed kid. */
export const a2PrivateKey: RsaPrivateJwk = {
  kty: "RSA",
  kid: kidOf("a2"),
  n: b64(rfc7515A2.n),
  e: b64(rfc7515A2.e),
  d: b64(rfc7515A2.d),
  p: b64(rfc7515A2.p),
  q: b64(rfc7515A2.q),
  dp: b64(rfc7515A2.dp),
  dq: b64(rfc7515A2.dq),
  qi: b64(rfc7515A2.qi),
};

export const a2PublicKey: RsaPublicJwk = {
  kty: "RSA",
  kid: kidOf("a2"),
  n: b64(rfc7515A2.n),
  e: b64(rfc7515A2.e),
};

/** The A.2 compact JWS exactly as the RFC lists it. */
export const a2Compact = (): CompactJws =>
  compactOf(
    rfc7515A2.headerB64,
    rfc7515A2.payloadB64,
    rfc7515A2.sigB64,
  );

/** Base64url of a value's JSON — for crafting headers. */
export const b64OfJson = (v: unknown): string =>
  base64UrlString(
    encodeBase64Url(utf8Bytes(JSON.stringify(v))),
  );

const epoch = 1300819380;

/** Claims valid around the A.2 epoch, overridable per test. */
export const claimsFixture = (
  over: Partial<JwtClaims>,
): JwtClaims => ({
  iss: str("https://op.example"),
  sub: str("subject-1"),
  aud: [str("client-1")],
  exp: epoch + 600,
  iat: epoch,
  nbf: none(),
  nonce: none(),
  ...over,
});

/** A clock inside the fixture claims' window. */
export const clockAt = (
  secondsFromEpoch: number,
): Time =>
  new Date((epoch + secondsFromEpoch) * 1000);

export const a2Jwks = (): Jwks =>
  jwks([a2PublicKey]);

/** A validator matching {@link claimsFixture}. */
export const validateConfig = (
  over: Partial<ValidateJwt>,
): ValidateJwt => ({
  jwks: a2Jwks(),
  issuer: str("https://op.example"),
  audience: str("client-1"),
  clock: clockAt(60),
  leewaySeconds: 0,
  nonce: none(),
  ...over,
});
