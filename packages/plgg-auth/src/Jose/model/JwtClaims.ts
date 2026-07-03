import {
  SoftStr,
  Str,
  Num,
  Option,
  Result,
  InvalidError,
  ok,
  pipe,
  cast,
  forProp,
  forOptionProp,
  asStr,
  asNum,
  chainResult,
  mapResult,
  mapErr,
  matchOption,
  decodeJson,
} from "plgg";
import {
  JoseError,
  joseErrorFromInvalid,
} from "plgg-auth/Jose/model/JoseError";

/**
 * The registered JWT claims (RFC 7519 §4.1) an
 * OIDC ID token carries, plus `nonce` (OIDC Core
 * §2). `aud` is normalized to an array on decode
 * (the wire allows a bare string); `exp`/`iat`/
 * `nbf` are NumericDate epoch seconds.
 */
export type JwtClaims = Readonly<{
  iss: Str;
  sub: Str;
  aud: ReadonlyArray<Str>;
  exp: Num;
  iat: Num;
  nbf: Option<Num>;
  nonce: Option<Str>;
}>;

const asAudience = (
  v: unknown,
): Result<ReadonlyArray<Str>, InvalidError> =>
  Array.isArray(v)
    ? v.reduce<
        Result<ReadonlyArray<Str>, InvalidError>
      >(
        (acc, item) =>
          pipe(
            acc,
            chainResult(
              (xs: ReadonlyArray<Str>) =>
                pipe(
                  asStr(item),
                  mapResult(
                    (
                      s: Str,
                    ): ReadonlyArray<Str> => [
                      ...xs,
                      s,
                    ],
                  ),
                ),
            ),
          ),
        ok([]),
      )
    : pipe(
        asStr(v),
        mapResult(
          (s: Str): ReadonlyArray<Str> => [s],
        ),
      );

/**
 * Validates an unknown decoded JSON value into
 * {@link JwtClaims} at the token boundary.
 */
export const asJwtClaims = (
  v: unknown,
): Result<JwtClaims, InvalidError> =>
  cast(
    v,
    forProp("iss", asStr),
    forProp("sub", asStr),
    forProp("aud", asAudience),
    forProp("exp", asNum),
    forProp("iat", asNum),
    forOptionProp("nbf", asNum),
    forOptionProp("nonce", asStr),
  );

const audJson = (
  aud: ReadonlyArray<Str>,
): string | ReadonlyArray<string> => {
  const [only, ...rest] = aud;
  return only !== undefined && rest.length === 0
    ? only.content
    : aud.map((a) => a.content);
};

/**
 * Serializes claims for signing. A single
 * audience goes on the wire as a bare string
 * (the common OIDC shape); `None` fields are
 * omitted, never `null`. Total for this shape
 * (strings and numbers only), so the throwing
 * `JSON.stringify` needs no lifting.
 */
export const claimsJson = (
  claims: JwtClaims,
): SoftStr =>
  JSON.stringify({
    iss: claims.iss.content,
    sub: claims.sub.content,
    aud: audJson(claims.aud),
    exp: claims.exp,
    iat: claims.iat,
    ...matchOption(
      () => ({}),
      (n: Num) => ({ nbf: n }),
    )(claims.nbf),
    ...matchOption(
      () => ({}),
      (s: Str) => ({ nonce: s.content }),
    )(claims.nonce),
  });

/**
 * Parses a JWT payload JSON string into typed
 * claims — shared by the verified
 * (`validateJwt`) and unverified (`decodeJwt`)
 * paths.
 */
export const decodeClaimsJson = (
  json: SoftStr,
): Result<JwtClaims, JoseError> =>
  pipe(
    decodeJson(json),
    mapErr(joseErrorFromInvalid("DecodeFailure")),
    chainResult((v: unknown) =>
      pipe(
        asJwtClaims(v),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
  );
