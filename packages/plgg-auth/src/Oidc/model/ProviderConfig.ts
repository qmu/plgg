import { Num, Str } from "plgg";
import { AuthStore } from "plgg-auth/Oidc/model/AuthStore";

/**
 * The provider's static configuration. `issuer`
 * is the base URL every endpoint URL is prefixed
 * with and the `iss` claim of every ID token;
 * `loginPath` is the app-owned route
 * `/authorize` redirects an unauthenticated user
 * to. TTLs are in seconds. The `clock` is
 * injected so issuance/expiry are deterministic
 * under test.
 */
export type ProviderConfig = Readonly<{
  issuer: Str;
  loginPath: Str;
  store: AuthStore;
  codeTtlSeconds: Num;
  accessTtlSeconds: Num;
  idTokenTtlSeconds: Num;
  sessionTtlSeconds: Num;
  pendingTtlSeconds: Num;
  clock: () => Num;
}>;

/** The OP's own path constants under the issuer. */
export const oidcPaths = {
  discovery: "/.well-known/openid-configuration",
  jwks: "/jwks.json",
  authorize: "/authorize",
  token: "/token",
  userinfo: "/userinfo",
};

/** Joins the issuer with a path into an endpoint URL. */
export const endpointUrl = (
  config: ProviderConfig,
  path: string,
): string =>
  `${config.issuer.content.replace(/\/$/, "")}${path}`;

/**
 * The OIDC discovery document (a subset of
 * OpenID Connect Discovery 1.0 §3): every URL is
 * issuer-prefixed and the advertised
 * capabilities match exactly what this provider
 * implements (code flow, S256, RS256).
 */
export const discoveryDocument = (
  config: ProviderConfig,
): Readonly<Record<string, unknown>> => ({
  issuer: config.issuer.content,
  authorization_endpoint: endpointUrl(
    config,
    oidcPaths.authorize,
  ),
  token_endpoint: endpointUrl(
    config,
    oidcPaths.token,
  ),
  userinfo_endpoint: endpointUrl(
    config,
    oidcPaths.userinfo,
  ),
  jwks_uri: endpointUrl(config, oidcPaths.jwks),
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: [
    "RS256",
  ],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: [
    "client_secret_basic",
    "client_secret_post",
    "none",
  ],
  scopes_supported: [
    "openid",
    "profile",
    "email",
  ],
});
