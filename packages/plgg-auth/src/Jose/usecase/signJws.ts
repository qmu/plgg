import {
  SoftStr,
  Result,
  box,
  err,
  pipe,
  mapResult,
  matchResult,
} from "plgg";
import {
  Base64UrlStr,
  base64UrlString,
  encodeBase64Url,
  utf8Bytes,
  toBufferSource,
} from "plgg-auth/Jose/model/Base64Url";
import {
  RsaPrivateJwk,
  rs256Params,
  kidString,
} from "plgg-auth/Jose/model/Jwk";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import {
  JoseError,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";
import { importSignKey } from "plgg-auth/Jose/usecase/importRsaKey";

const headerJson = (
  key: RsaPrivateJwk,
): SoftStr =>
  // Total shape (two strings), so the throwing
  // JSON.stringify needs no lifting.
  JSON.stringify({
    alg: "RS256",
    kid: kidString(key.kid),
  });

/**
 * The `header.payload` string both signing and
 * verifying hash over (RFC 7515 §5.1).
 */
export const signingInput = (
  header: Base64UrlStr,
  payload: Base64UrlStr,
): SoftStr =>
  `${base64UrlString(header)}.${base64UrlString(
    payload,
  )}`;

/**
 * Signs a prepared `header.payload` signing input
 * with an already-imported RS256 key, appending
 * the signature as the third base64url segment.
 * The one place `crypto.subtle.sign`'s throwing
 * surface is lifted onto the `Result` channel: a
 * `CryptoKey` that lacks the `"sign"` usage
 * rejects here as a `SignFailure` on every
 * runtime (WebCrypto checks the usage before any
 * key-material math), which is how the reject arm
 * is exercised deterministically.
 */
export const signWith =
  (key: CryptoKey) =>
  (
    input: SoftStr,
  ): Promise<Result<CompactJws, JoseError>> =>
    liftJose<ArrayBuffer>("SignFailure")(() =>
      crypto.subtle.sign(
        rs256Params.name,
        key,
        toBufferSource(utf8Bytes(input)),
      ),
    ).then(
      mapResult(
        (sig: ArrayBuffer): CompactJws =>
          // Three base64url segments by
          // construction, so the box preserves
          // the CompactJws invariant.
          box("CompactJws")(
            `${input}.${base64UrlString(
              encodeBase64Url(
                new Uint8Array(sig),
              ),
            )}`,
          ),
      ),
    );

/**
 * Signs a payload string as an RS256 compact JWS
 * whose protected header carries the key's
 * `kid`. Deterministic: RSASSA-PKCS1-v1_5 yields
 * the same signature for the same input and key.
 */
export const signJws =
  (key: RsaPrivateJwk) =>
  async (
    payload: SoftStr,
  ): Promise<Result<CompactJws, JoseError>> => {
    const input = signingInput(
      encodeBase64Url(utf8Bytes(headerJson(key))),
      encodeBase64Url(utf8Bytes(payload)),
    );
    return pipe(
      await importSignKey(key),
      matchResult(
        (
          e: JoseError,
        ): Promise<
          Result<CompactJws, JoseError>
        > => Promise.resolve(err(e)),
        (cryptoKey: CryptoKey) =>
          signWith(cryptoKey)(input),
      ),
    );
  };
