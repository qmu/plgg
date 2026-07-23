import {
  SoftStr,
  Dict,
  Option,
  Result,
  ok,
  err,
  isErr,
  none,
  fromNullable,
  isSome,
} from "plgg";
import {
  Client,
  clientIdString,
  redirectUriString,
} from "plgg-auth/Oidc/model/Client";
import {
  asCodeVerifier,
  computeS256Challenge,
  pkceMatches,
} from "plgg-auth/Oidc/model/Pkce";
import { asAuthCode } from "plgg-auth/Oidc/model/Tokens";
import {
  IssuedCode,
  liftStore,
} from "plgg-auth/Oidc/model/AuthStore";
import {
  freshRefreshToken,
  freshFamilyId,
  hashRefreshToken,
} from "plgg-auth/Oidc/model/RefreshToken";
import { ProviderConfig } from "plgg-auth/Oidc/model/ProviderConfig";
import {
  OidcError,
  invalidRequest,
  invalidGrant,
  serverError,
} from "plgg-auth/Oidc/model/OidcError";
import {
  TokenResponse,
  issueTokensFor,
} from "plgg-auth/Oidc/usecase/issueTokens";

const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

const requiredField = (
  form: Dict<string, SoftStr>,
  name: SoftStr,
): Result<SoftStr, OidcError> => {
  const found = lookupOwn(form, name);
  return isSome(found)
    ? ok(found.content)
    : err(invalidRequest(`missing "${name}"`));
};

const checkPkce =
  (code: IssuedCode) =>
  async (
    verifier: SoftStr,
  ): Promise<Result<IssuedCode, OidcError>> => {
    const parsed = asCodeVerifier(verifier);
    if (isErr(parsed)) {
      return err(
        invalidGrant("malformed code_verifier"),
      );
    }
    const computed = await computeS256Challenge(
      parsed.content,
    );
    if (isErr(computed)) {
      return err(
        serverError(
          "failed to compute PKCE challenge",
        ),
      );
    }
    return pkceMatches(
      computed.content,
      code.codeChallenge,
    )
      ? ok(code)
      : err(
          invalidGrant(
            "PKCE verification failed",
          ),
        );
  };

/**
 * The authorization-code grant: redeem a code
 * (single-use, via the store's atomic `takeCode`),
 * re-check the client binding, `redirect_uri`,
 * expiry, and PKCE, then issue tokens. Every
 * grant failure is `invalid_grant`; the client
 * has already been authenticated by the caller.
 * Async-shell style.
 */
export const exchangeCode =
  (config: ProviderConfig) =>
  (client: Client) =>
  async (
    form: Dict<string, SoftStr>,
  ): Promise<
    Result<TokenResponse, OidcError>
  > => {
    const now = config.clock();
    const codeField = requiredField(form, "code");
    if (isErr(codeField)) {
      return codeField;
    }
    const redirectField = requiredField(
      form,
      "redirect_uri",
    );
    if (isErr(redirectField)) {
      return redirectField;
    }
    const verifierField = requiredField(
      form,
      "code_verifier",
    );
    if (isErr(verifierField)) {
      return verifierField;
    }
    const parsedCode = asAuthCode(
      codeField.content,
    );
    if (isErr(parsedCode)) {
      return err(invalidGrant("malformed code"));
    }
    const taken = await liftStore(() =>
      config.store.takeCode(parsedCode.content),
    );
    if (isErr(taken)) {
      return taken;
    }
    if (!isSome(taken.content)) {
      return err(
        invalidGrant(
          "authorization code is invalid, expired, or already used",
        ),
      );
    }
    const code = taken.content.content;
    if (code.expiresAt <= now) {
      return err(
        invalidGrant(
          "authorization code has expired",
        ),
      );
    }
    if (
      clientIdString(code.clientId) !==
      clientIdString(client.id)
    ) {
      return err(
        invalidGrant(
          "authorization code was issued to a different client",
        ),
      );
    }
    if (
      redirectUriString(code.redirectUri) !==
      redirectField.content
    ) {
      return err(
        invalidGrant(
          "redirect_uri does not match the authorization request",
        ),
      );
    }
    const verified = await checkPkce(code)(
      verifierField.content,
    );
    if (isErr(verified)) {
      return verified;
    }
    return issueWithRefresh(config)(code);
  };

/**
 * Issues the access + ID token AND an initial
 * refresh token for a redeemed code: a fresh
 * family is opened and its first token persisted
 * (hashed) before the response is built.
 */
const issueWithRefresh =
  (config: ProviderConfig) =>
  async (
    code: IssuedCode,
  ): Promise<
    Result<TokenResponse, OidcError>
  > => {
    const now = config.clock();
    const refresh = freshRefreshToken();
    const hash = await hashRefreshToken(refresh);
    if (isErr(hash)) {
      return err(
        serverError(
          "failed to hash the refresh token",
        ),
      );
    }
    const saved = await liftStore(() =>
      config.store.saveRefreshToken({
        tokenHash: hash.content,
        familyId: freshFamilyId(),
        clientId: code.clientId,
        subject: code.subject,
        scopes: code.scopes,
        rotatedFrom: none(),
        status: "active",
        expiresAt: now + config.refreshTtlSeconds,
      }),
    );
    if (isErr(saved)) {
      return saved;
    }
    return issueTokensFor(config)(
      {
        subject: code.subject,
        clientId: code.clientId,
        scopes: code.scopes,
        nonce: code.nonce,
      },
      refresh,
    );
  };
