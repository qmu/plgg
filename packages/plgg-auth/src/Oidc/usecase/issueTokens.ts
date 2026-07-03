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
} from "plgg";
import { CompactJws } from "plgg-auth/Jose/model/CompactJws";
import { JwtClaims } from "plgg-auth/Jose/model/JwtClaims";
import { encodeJwt } from "plgg-auth/Jose/usecase/encodeJwt";
import {
  AccessGrant,
  IssuedCode,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  AccessToken,
  freshAccessToken,
  subjectString,
} from "plgg-auth/Oidc/model/Tokens";
import {
  Nonce,
  nonceString,
} from "plgg-auth/Oidc/model/AuthorizationRequest";
import {
  ClientId,
  clientIdString,
} from "plgg-auth/Oidc/model/Client";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";

/** The token-endpoint success payload. */
export type TokenResponse = Readonly<{
  accessToken: AccessToken;
  idToken: CompactJws;
  expiresIn: Num;
}>;

const idClaims = (
  config: ProviderConfig,
  code: IssuedCode,
  now: Num,
): JwtClaims => ({
  iss: config.issuer,
  sub: box("Str")(subjectString(code.subject)),
  aud: [
    box("Str")(clientIdString(code.clientId)),
  ],
  exp: now + config.idTokenTtlSeconds,
  iat: now,
  nbf: none(),
  nonce: mapNonce(code.nonce),
});

const mapNonce = (
  nonce: Option<Nonce>,
): Option<Str> =>
  nonce.__tag === "Some"
    ? some(box("Str")(nonceString(nonce.content)))
    : none();

/**
 * Issues an access token and a signed ID token
 * for a redeemed authorization code, and
 * persists the access grant. The signing key is
 * pulled from the store's active key; a missing
 * key is a `ServerError` (misconfiguration, not
 * client fault). Async-shell style.
 */
export const issueTokens =
  (config: ProviderConfig) =>
  async (
    code: IssuedCode,
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
    )(idClaims(config, code, now));
    if (isErr(idToken)) {
      return err(
        serverError(
          `failed to sign id token: ${idToken.content.content.message}`,
          idToken.content,
        ),
      );
    }
    const grant: AccessGrant = {
      token: freshAccessToken(),
      subject: code.subject,
      clientId: code.clientId,
      scopes: code.scopes,
      expiresAt: now + config.accessTtlSeconds,
    };
    const saved = await liftStore(() =>
      config.store.saveAccessGrant(grant),
    );
    if (isErr(saved)) {
      return saved;
    }
    return ok({
      accessToken: grant.token,
      idToken: idToken.content,
      expiresIn: config.accessTtlSeconds,
    });
  };

// Re-export for the token handler's convenience.
export type { ClientId };
