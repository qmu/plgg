# plgg-auth

OIDC identity-provider toolkit built from scratch on the
[plgg monorepo](../../README.md)'s core framework — zero
third-party runtime dependencies, WebCrypto
(`crypto.subtle`) only, so it runs anywhere plgg-server
runs (node / bun / deno).

## Jose layer

The `Jose/` domain implements the JOSE subset an OIDC
provider needs, in house style (branded types, `Result`
not `throw`, `Option` not `null`):

- **Base64url** (RFC 4648 §5, unpadded):
  `encodeBase64Url` / `decodeBase64Url` over the branded
  `Base64UrlStr`.
- **JWK / JWKS** (RFC 7517): `RsaPublicJwk` /
  `RsaPrivateJwk` records with boundary casters,
  `generateRsaKey` (RSA-2048, RSASSA-PKCS1-v1_5 /
  SHA-256), `thumbprintKid` (RFC 7638 SHA-256 thumbprint
  as the branded `Kid`), and a `Jwks` set with
  `findJwk` lookup and a JSON-ready `jwksJson` document.
- **JWS** (RFC 7515, compact serialization, RS256 only —
  no `alg: none`, no downgrade): `signJws`, `verifyJws`
  (kid lookup through a `Jwks`), `verifyJwsWith`
  (explicit key).
- **JWT** (RFC 7519): typed `JwtClaims`, `encodeJwt`,
  `decodeJwt` (parse without verification), and
  `validateJwt` (signature + `iss` / `aud` / `exp` /
  `nbf` / `nonce` checks with an injected clock, each
  failure a distinct `JoseError` kind).

Correctness is pinned to the RFC test vectors
(RFC 7515 Appendix A.2, RFC 7638 §3.1) and cross-checked
in both directions against `node:crypto` in the specs.

## OIDC provider

The `Oidc/` domain is the OpenID Connect provider (OP)
itself — the authorization-code flow with mandatory S256
PKCE (no implicit/hybrid, no `plain`):

- **Branded models**: `Client` (public or confidential
  by a SHA-256 `ClientSecretHash`), `RedirectUri`
  (exact-match only), `Scope`/`State`/`Nonce`,
  `CodeVerifier`/`CodeChallenge`, `Subject`, and
  single-use `AuthCode`/`AccessToken`/`SessionId` minted
  from `crypto.getRandomValues`. `OidcError` carries the
  RFC 6749 error code and HTTP status for every failure.
- **`AuthStore` seam**: the capability record the library
  never implements — the app supplies a driver (an
  in-memory one ships in `testkit/`; a plgg-sql driver
  is the phase-4 concern). `take*` operations are atomic
  get-and-delete, so single-use lives in the store
  contract.
- **Endpoints** via `mountOidc(config)` (a data-last
  `Web => Web`): `/.well-known/openid-configuration`,
  `/jwks.json`, `/authorize` (+PKCE), `/token`
  (`authorization_code`, `client_secret_basic` /
  `client_secret_post` / `none`), and `/userinfo`
  (Bearer). Errors on an unvalidated `redirect_uri`
  render locally — never an open redirect.
- **Login seam**: the OP owns the protocol only. When
  `/authorize` finds no session it redirects to an
  app-owned login route; the app authenticates however
  it likes and calls `completeAuthorization(...)`, then
  returns `sessionRedirect(...)` to set the session
  cookie and bounce back to the RP. No password handling
  or login HTML lives in the library.

`example.ts` runs a full OP+RP authorization-code + PKCE
round trip in-process (discovery → authorize → login →
token → ID-token validation → userinfo) and prints each
step.

## Commands

```sh
npm run test      # tsc --noEmit && plgg-test src
npm run coverage  # coverage-gated run (threshold 91)
npm run build     # dist via plgg-bundle
```
