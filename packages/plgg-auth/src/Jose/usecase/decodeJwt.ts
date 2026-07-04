import {
  Bin,
  SoftStr,
  Result,
  pipe,
  chainResult,
  mapErr,
} from "plgg";
import {
  utf8String,
  decodeBase64Url,
} from "plgg-auth/Jose/model/Base64Url";
import {
  CompactJws,
  JwsParts,
  parseCompactJws,
} from "plgg-auth/Jose/model/CompactJws";
import {
  JwtClaims,
  decodeClaimsJson,
} from "plgg-auth/Jose/model/JwtClaims";
import {
  JoseError,
  joseErrorFromInvalid,
} from "plgg-auth/Jose/model/JoseError";

/**
 * Parses a JWT's claims WITHOUT verifying its
 * signature — for logging, debugging, and
 * pre-verification routing only. Anything
 * trust-bearing goes through `validateJwt`.
 */
export const decodeJwt = (
  jws: CompactJws,
): Result<JwtClaims, JoseError> =>
  pipe(
    parseCompactJws(jws),
    chainResult((parts: JwsParts) =>
      pipe(
        decodeBase64Url(parts.payload),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
    chainResult((bytes: Bin) =>
      pipe(
        utf8String(bytes),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
    chainResult((json: SoftStr) =>
      decodeClaimsJson(json),
    ),
  );
