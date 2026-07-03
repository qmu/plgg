import {
  Result,
  InvalidError,
  err,
  pipe,
  cast,
  forProp,
  mapErr,
  mapResult,
  chainResult,
  matchResult,
} from "plgg";
import {
  Base64UrlStr,
  asBase64UrlStr,
} from "plgg-auth/Jose/model/Base64Url";
import {
  Kid,
  RsaPublicJwk,
  RsaPrivateJwk,
} from "plgg-auth/Jose/model/Jwk";
import {
  JoseError,
  joseErrorFromInvalid,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";
import { thumbprintKid } from "plgg-auth/Jose/usecase/thumbprint";

/**
 * A freshly generated signing key pair, both
 * halves carrying the same thumbprint `kid`.
 */
export type RsaKeyPair = Readonly<{
  publicKey: RsaPublicJwk;
  privateKey: RsaPrivateJwk;
}>;

const rsaGenParams = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([
    0x01, 0x00, 0x01,
  ]),
  hash: "SHA-256",
};

const exportFreshKey = (): Promise<unknown> =>
  crypto.subtle
    .generateKey(rsaGenParams, true, [
      "sign",
      "verify",
    ])
    .then((pair) =>
      crypto.subtle.exportKey(
        "jwk",
        pair.privateKey,
      ),
    );

type PrivateMaterial = Readonly<{
  n: Base64UrlStr;
  e: Base64UrlStr;
  d: Base64UrlStr;
  p: Base64UrlStr;
  q: Base64UrlStr;
  dp: Base64UrlStr;
  dq: Base64UrlStr;
  qi: Base64UrlStr;
}>;

const asPrivateMaterial = (
  v: unknown,
): Result<PrivateMaterial, InvalidError> =>
  cast(
    v,
    forProp("n", asBase64UrlStr),
    forProp("e", asBase64UrlStr),
    forProp("d", asBase64UrlStr),
    forProp("p", asBase64UrlStr),
    forProp("q", asBase64UrlStr),
    forProp("dp", asBase64UrlStr),
    forProp("dq", asBase64UrlStr),
    forProp("qi", asBase64UrlStr),
  );

const buildPair =
  (m: PrivateMaterial) =>
  (kid: Kid): RsaKeyPair => ({
    publicKey: {
      kty: "RSA",
      n: m.n,
      e: m.e,
      kid,
    },
    privateKey: {
      kty: "RSA",
      n: m.n,
      e: m.e,
      kid,
      d: m.d,
      p: m.p,
      q: m.q,
      dp: m.dp,
      dq: m.dq,
      qi: m.qi,
    },
  });

/**
 * Generates an RSA-2048 RSASSA-PKCS1-v1_5 /
 * SHA-256 signing pair and returns both halves
 * as typed JWKs named by their RFC 7638
 * thumbprint. Short-circuits on `Err` through
 * `matchResult`/`chainResult` — no branching of
 * its own around the WebCrypto seam.
 */
export const generateRsaKey = (): Promise<
  Result<RsaKeyPair, JoseError>
> =>
  liftJose<unknown>("KeyFailure")(
    exportFreshKey,
  ).then((exported) =>
    pipe(
      exported,
      chainResult((v: unknown) =>
        pipe(
          asPrivateMaterial(v),
          mapErr(
            joseErrorFromInvalid("KeyFailure"),
          ),
        ),
      ),
      matchResult(
        (
          e: JoseError,
        ): Promise<
          Result<RsaKeyPair, JoseError>
        > => Promise.resolve(err(e)),
        (m: PrivateMaterial) =>
          thumbprintKid({
            n: m.n,
            e: m.e,
          }).then(mapResult(buildPair(m))),
      ),
    ),
  );
