import {
  Str,
  Num,
  Option,
  Result,
  ok,
  err,
  isErr,
  some,
  none,
  box,
  matchOption,
} from "plgg";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import { JwtClaims } from "plgg-auth/Jose/model/JwtClaims";
import { encodeJwt } from "plgg-auth/Jose/usecase/encodeJwt";
import {
  AccessGrant,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  AccessToken,
  Subject,
  freshAccessToken,
  subjectString,
} from "plgg-auth/Oidc/model/Tokens";
import {
  Nonce,
  Scope,
  nonceString,
} from "plgg-auth/Oidc/model/AuthorizationRequest";
import {
  ClientId,
  clientIdString,
} from "plgg-auth/Oidc/model/Client";
import {
  RefreshToken,
  refreshTokenString,
} from "plgg-auth/Oidc/model/RefreshToken";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";

/**
 * The token-endpoint success payload. A refresh
 * token is always issued (both the code and
 * refresh grants mint one), so it is not
 * optional.
 */
export type TokenResponse = Readonly<{
  accessToken: AccessToken;
  idToken: CompactJws;
  refreshToken: RefreshToken;
  expiresIn: Num;
}>;

/**
 * What a token issuance needs from its grant —
 * shared by the code exchange and the refresh
 * rotation.
 */
export type GrantContext = Readonly<{
  subject: Subject;
  clientId: ClientId;
  scopes: ReadonlyArray<Scope>;
  nonce: Option<Nonce>;
}>;

const mapNonce = (
  nonce: Option<Nonce>,
): Option<Str> =>
  matchOption(
    (): Option<Str> => none(),
    (n: Nonce) =>
      some(box("Str")(nonceString(n))),
  )(nonce);

const idClaims = (
  config: ProviderConfig,
  grant: GrantContext,
  now: Num,
): JwtClaims => ({
  iss: config.issuer,
  sub: box("Str")(subjectString(grant.subject)),
  aud: [
    box("Str")(clientIdString(grant.clientId)),
  ],
  exp: now + config.idTokenTtlSeconds,
  iat: now,
  nbf: none(),
  nonce: mapNonce(grant.nonce),
});

/**
 * Issues an access token and a signed ID token
 * for a grant, persists the access grant, and
 * echoes the caller-supplied refresh token in
 * the response. The signing key is the store's
 * active key; a missing key is a `ServerError`.
 * Async-shell style.
 */
export const issueTokensFor =
  (config: ProviderConfig) =>
  async (
    grant: GrantContext,
    refresh: RefreshToken,
  ): Promise<
    Result<TokenResponse, OidcError>
  > => {
    const now = config.clock();
    const key = await liftStore(() =>
      config.store.activeSigningKey(),
    );
    if (isErr(key)) {
      return key;
    }
    if (key.content.__tag === "None") {
      return err(
        serverError(
          "no active signing key configured",
        ),
      );
    }
    const idToken = await encodeJwt(
      key.content.content,
    )(idClaims(config, grant, now));
    if (isErr(idToken)) {
      return err(
        serverError(
          `failed to sign id token: ${idToken.content.content.message}`,
          idToken.content,
        ),
      );
    }
    const accessGrant: AccessGrant = {
      token: freshAccessToken(),
      subject: grant.subject,
      clientId: grant.clientId,
      scopes: grant.scopes,
      expiresAt: now + config.accessTtlSeconds,
    };
    const saved = await liftStore(() =>
      config.store.saveAccessGrant(accessGrant),
    );
    if (isErr(saved)) {
      return saved;
    }
    return ok({
      accessToken: accessGrant.token,
      idToken: idToken.content,
      refreshToken: refresh,
      expiresIn: config.accessTtlSeconds,
    });
  };

/** Re-export the refresh string reader for handlers. */
export { refreshTokenString };
