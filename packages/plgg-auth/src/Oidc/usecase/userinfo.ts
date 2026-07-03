import {
  SoftStr,
  Result,
  ok,
  err,
  isErr,
  matchOption,
} from "plgg";
import {
  AccessGrant,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  asAccessToken,
  subjectString,
} from "plgg-auth/Oidc/model/Tokens";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  unauthenticated,
} from "plgg-auth/Oidc/model/OidcError";

const bearerToken = (
  header: SoftStr,
): Result<SoftStr, OidcError> =>
  header.startsWith("Bearer ")
    ? ok(header.slice(7))
    : err(
        unauthenticated(
          "expected a Bearer access token",
        ),
      );

/**
 * Resolves a Bearer access token to its live
 * access grant, or a distinct `Unauthenticated`
 * failure — the shared core of the `/userinfo`
 * handler and any bearer middleware. Expired or
 * unknown tokens are rejected, never leaked.
 * Async-shell style.
 */
export const authenticateBearer =
  (config: ProviderConfig) =>
  async (
    authorizationHeader: SoftStr,
  ): Promise<Result<AccessGrant, OidcError>> => {
    const raw = bearerToken(authorizationHeader);
    if (isErr(raw)) {
      return raw;
    }
    const parsed = asAccessToken(raw.content);
    if (isErr(parsed)) {
      return err(
        unauthenticated("malformed access token"),
      );
    }
    const found = await liftStore(() =>
      config.store.findAccessGrant(
        parsed.content,
      ),
    );
    if (isErr(found)) {
      return found;
    }
    const now = config.clock();
    return matchOption(
      (): Result<AccessGrant, OidcError> =>
        err(
          unauthenticated("unknown access token"),
        ),
      (grant: AccessGrant) =>
        grant.expiresAt <= now
          ? err(
              unauthenticated(
                "access token has expired",
              ),
            )
          : ok(grant),
    )(found.content);
  };

/**
 * The UserInfo claims for a grant. Data
 * minimization: only `sub` is asserted here;
 * richer claims are a phase-4 concern gated on
 * registered scopes.
 */
export const userinfoClaims = (
  grant: AccessGrant,
): Readonly<Record<string, unknown>> => ({
  sub: subjectString(grant.subject),
});
