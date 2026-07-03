import {
  SoftStr,
  Result,
  Option,
  ok,
  err,
  isErr,
  pipe,
  box,
  some,
  none,
  getOr,
  fromNullable,
} from "plgg";
import {
  Web,
  Handler,
  Context,
  HttpResponse,
  HttpError,
  get,
  post,
  header,
  jsonResponse,
  redirectResponse,
  statusOf,
  parseForm,
  getCookie,
  sessionCookie,
  withSetCookie,
  internalError,
} from "plgg-server";
import {
  ProviderConfig,
  oidcPaths,
  discoveryDocument,
} from "plgg-auth/Oidc/model/ProviderConfig";
import { jwksJson } from "plgg-auth/Jose/model/Jwks";
import { liftStore } from "plgg-auth/Oidc/model/AuthStore";
import {
  OidcError,
  unsupportedGrantType,
  oauthErrorCode,
  oauthErrorStatus,
} from "plgg-auth/Oidc/model/OidcError";
import { authorize } from "plgg-auth/Oidc/usecase/authorize";
import {
  readClientCredential,
  authenticateClient,
} from "plgg-auth/Oidc/usecase/authenticateClient";
import { exchangeCode } from "plgg-auth/Oidc/usecase/exchangeCode";
import {
  authenticateBearer,
  userinfoClaims,
} from "plgg-auth/Oidc/usecase/userinfo";
import { TokenResponse } from "plgg-auth/Oidc/usecase/issueTokens";

/** The name of the OP session cookie. */
export const SESSION_COOKIE = "plgg_auth_session";

const oauthErrorResponse = (
  e: OidcError,
): HttpResponse =>
  jsonResponse(
    {
      error: oauthErrorCode(e),
      error_description: e.content.message,
    },
    statusOf(oauthErrorStatus(e)),
  );

const lookupOwn = (
  map: Readonly<Record<string, SoftStr>>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

const discoveryHandler =
  (config: ProviderConfig): Handler =>
  async () =>
    ok(jsonResponse(discoveryDocument(config)));

const jwksHandler =
  (config: ProviderConfig): Handler =>
  async () => {
    const set = await liftStore(() =>
      config.store.verificationJwks(),
    );
    return isErr(set)
      ? ok(oauthErrorResponse(set.content))
      : ok(jsonResponse(jwksJson(set.content)));
  };

const authorizeHandler =
  (config: ProviderConfig): Handler =>
  async (c: Context) => {
    const outcome = await authorize(config)(
      c.req.query,
      getCookie(SESSION_COOKIE)(c.req),
    )();
    return outcome.kind === "LocalError"
      ? ok(oauthErrorResponse(outcome.error))
      : ok(redirectResponse(outcome.location));
  };

const tokenResponseBody = (
  tokens: TokenResponse,
): HttpResponse =>
  jsonResponse({
    access_token: tokens.accessToken.content,
    token_type: "Bearer",
    expires_in: tokens.expiresIn,
    id_token: tokens.idToken.content,
  });

const tokenHandler =
  (config: ProviderConfig): Handler =>
  async (c: Context) => {
    const form = parseForm(c.req.body);
    const grantType = pipe(
      lookupOwn(form, "grant_type"),
      getOr(""),
    );
    if (grantType !== "authorization_code") {
      return ok(
        oauthErrorResponse(
          unsupportedGrantType(
            `unsupported grant_type "${grantType}"`,
          ),
        ),
      );
    }
    const credential = readClientCredential(
      form,
      header("authorization")(c),
    );
    if (isErr(credential)) {
      return ok(
        oauthErrorResponse(credential.content),
      );
    }
    const client = await authenticateClient(
      config.store,
    )(credential.content);
    if (isErr(client)) {
      return ok(
        oauthErrorResponse(client.content),
      );
    }
    const tokens = await exchangeCode(config)(
      client.content,
    )(form);
    return isErr(tokens)
      ? ok(oauthErrorResponse(tokens.content))
      : ok(tokenResponseBody(tokens.content));
  };

const userinfoHandler =
  (config: ProviderConfig): Handler =>
  async (c: Context) => {
    const grant = await authenticateBearer(
      config,
    )(
      pipe(header("authorization")(c), getOr("")),
    );
    return isErr(grant)
      ? ok(oauthErrorResponse(grant.content))
      : ok(
          jsonResponse(
            userinfoClaims(grant.content),
          ),
        );
  };

/**
 * Mounts the OIDC provider endpoints onto a
 * {@link Web} (data-last `Web => Web`):
 * discovery, JWKS, `/authorize`, `/token`, and
 * `/userinfo`. Pipe it over `web()` like any
 * other route group. The app still owns the
 * login route the config points `loginPath` at.
 */
export const mountOidc =
  (config: ProviderConfig) =>
  (app: Web): Web =>
    pipe(
      app,
      get(
        oidcPaths.discovery,
        discoveryHandler(config),
      ),
      get(oidcPaths.jwks, jwksHandler(config)),
      get(
        oidcPaths.authorize,
        authorizeHandler(config),
      ),
      post(oidcPaths.token, tokenHandler(config)),
      get(
        oidcPaths.userinfo,
        userinfoHandler(config),
      ),
    );

const sessionCookieFor = (
  config: ProviderConfig,
  sessionId: SoftStr,
) => ({
  ...sessionCookie(
    box("CookieName")(SESSION_COOKIE),
    box("CookieValue")(sessionId),
  ),
  maxAge: some(config.sessionTtlSeconds),
});

/**
 * Builds the `Set-Cookie` redirect the app's
 * login route returns after
 * `completeAuthorization`: the OP session cookie
 * on the secure baseline (`HttpOnly; Secure;
 * SameSite=Lax`, scoped to the session TTL) plus
 * a redirect back to the RP.
 */
export const sessionRedirect = (
  config: ProviderConfig,
  location: SoftStr,
  sessionId: SoftStr,
): Result<HttpResponse, HttpError> =>
  pipe(
    withSetCookie(
      sessionCookieFor(config, sessionId),
    )(redirectResponse(location)),
    (r): Result<HttpResponse, HttpError> =>
      isErr(r)
        ? err(
            internalError(
              "failed to serialize session cookie",
            ),
          )
        : ok(r.content),
  );
