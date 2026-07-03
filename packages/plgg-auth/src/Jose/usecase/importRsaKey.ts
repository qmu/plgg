import { Result } from "plgg";
import {
  RsaPublicJwk,
  RsaPrivateJwk,
  rs256Params,
  publicJwkJson,
  privateJwkJson,
} from "plgg-auth/Jose/model/Jwk";
import {
  JoseError,
  liftJose,
} from "plgg-auth/Jose/model/JoseError";

/**
 * Imports a public JWK as a WebCrypto verify
 * key. Non-extractable; failure (malformed key
 * material) folds to a `KeyFailure`.
 */
export const importVerifyKey = (
  key: RsaPublicJwk,
): Promise<Result<CryptoKey, JoseError>> =>
  liftJose<CryptoKey>("KeyFailure")(() =>
    crypto.subtle.importKey(
      "jwk",
      publicJwkJson(key),
      rs256Params,
      false,
      ["verify"],
    ),
  );

/**
 * Imports a private JWK as a WebCrypto sign key.
 */
export const importSignKey = (
  key: RsaPrivateJwk,
): Promise<Result<CryptoKey, JoseError>> =>
  liftJose<CryptoKey>("KeyFailure")(() =>
    crypto.subtle.importKey(
      "jwk",
      privateJwkJson(key),
      rs256Params,
      false,
      ["sign"],
    ),
  );
