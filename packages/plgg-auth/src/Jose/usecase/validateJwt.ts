import {
  SoftStr,
  Str,
  Num,
  Time,
  Option,
  Result,
  ok,
  err,
  pipe,
  chainResult,
  matchOption,
} from "plgg";
import { Jwks } from "plgg-auth/Jose/model/Jwks";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import {
  JwtClaims,
  decodeClaimsJson,
} from "plgg-auth/Jose/model/JwtClaims";
import {
  JoseError,
  issuerMismatch,
  audienceMismatch,
  expired,
  premature,
  nonceMismatch,
} from "plgg-auth/Jose/model/JoseError";
import { verifyJws } from "plgg-auth/Jose/usecase/verifyJws";

/**
 * What a validated JWT must satisfy. The clock
 * is injected (never read inside the domain) so
 * expiry rules are deterministic under test;
 * `leewaySeconds` absorbs clock skew in both
 * directions; `nonce` is checked only when the
 * validator expects one (`Some`).
 */
export type ValidateJwt = Readonly<{
  jwks: Jwks;
  issuer: Str;
  audience: Str;
  clock: Time;
  leewaySeconds: Num;
  nonce: Option<Str>;
}>;

const nbfViolated = (
  nbf: Option<Num>,
  now: Num,
  leeway: Num,
): boolean =>
  matchOption(
    () => false,
    (n: Num) => n > now + leeway,
  )(nbf);

const nonceViolated = (
  expected: Option<Str>,
  actual: Option<Str>,
): boolean =>
  matchOption(
    () => false,
    (want: Str) =>
      matchOption(
        () => true,
        (got: Str) =>
          got.content !== want.content,
      )(actual),
  )(expected);

/**
 * The pure claim rules (RFC 7519 §4.1, OIDC Core
 * §3.1.3.7), separated from the async signature
 * shell so every rule is unit-testable with a
 * fixed clock. Each violation is a distinct
 * {@link JoseError} kind.
 */
export const checkClaims =
  (config: ValidateJwt) =>
  (
    claims: JwtClaims,
  ): Result<JwtClaims, JoseError> => {
    const now = Math.floor(
      config.clock.getTime() / 1000,
    );
    const leeway = config.leewaySeconds;
    return claims.iss.content !==
      config.issuer.content
      ? err(
          issuerMismatch(
            `iss "${claims.iss.content}" is not the expected issuer "${config.issuer.content}"`,
          ),
        )
      : !claims.aud.some(
            (a) =>
              a.content ===
              config.audience.content,
          )
        ? err(
            audienceMismatch(
              `no aud entry matches the expected audience "${config.audience.content}"`,
            ),
          )
        : now - leeway >= claims.exp
          ? err(
              expired(
                `token expired at ${claims.exp} (now ${now}, leeway ${leeway}s)`,
              ),
            )
          : nbfViolated(claims.nbf, now, leeway)
            ? err(
                premature(
                  `token not valid before its nbf (now ${now}, leeway ${leeway}s)`,
                ),
              )
            : nonceViolated(
                  config.nonce,
                  claims.nonce,
                )
              ? err(
                  nonceMismatch(
                    "nonce is missing or does not match the expected value",
                  ),
                )
              : ok(claims);
  };

/**
 * Full ID-token validation: signature via the
 * JWKS (`kid`-resolved, RS256 only), then the
 * pure claim rules. The only trust-bearing path
 * from a compact JWS to typed claims.
 */
export const validateJwt =
  (config: ValidateJwt) =>
  async (
    jws: CompactJws,
  ): Promise<Result<JwtClaims, JoseError>> =>
    pipe(
      await verifyJws(config.jwks)(jws),
      chainResult((payload: SoftStr) =>
        decodeClaimsJson(payload),
      ),
      chainResult(checkClaims(config)),
    );
