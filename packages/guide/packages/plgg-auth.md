# plgg-auth

An **OpenID Connect identity-provider toolkit**, built
from scratch on [plgg](/packages/plgg/) with **zero
third-party runtime dependencies** — WebCrypto
(`crypto.subtle`) only, so it runs anywhere
[plgg-server](/packages/plgg-server) runs (node / bun /
deno). It is the provider the served
[plggpress](/packages/plggpress/auth-admin) instance
mounts and logs in against itself.

## Writing an app with it

The provider mounts as a data-last `Web => Web`,
supplying the standard OIDC endpoints (from the README):

```typescript
import { mountOidc } from "plgg-auth";

// mounts /.well-known/openid-configuration, /jwks.json,
// /authorize (+ mandatory S256 PKCE), /token, /userinfo
const web = mountOidc(config)(baseWeb);
```

The library owns the protocol only. When `/authorize`
finds no session it redirects to an app-owned login
route; the app authenticates however it likes and calls
`completeAuthorization(...)`, then returns
`sessionRedirect(...)` to set the session cookie and
bounce back to the relying party — no password handling
or login HTML lives in the library. Its `example.ts`
runs a full OP+RP authorization-code + PKCE round trip
in-process.

## Vocabulary

- **Jose** — the JOSE subset an OP needs, in house
  style: `Base64url` (RFC 4648 §5), `JWK`/`JWKS`
  (RFC 7517; `generateRsaKey`, `thumbprintKid`), `JWS`
  (RFC 7515, RS256 only — no `alg: none`), and `JWT`
  (RFC 7519; `encodeJwt`, `decodeJwt`, `validateJwt`
  with an injected clock). Pinned to RFC test vectors.
- **Oidc** — the provider: branded `Client` /
  `RedirectUri` (exact-match) / `Scope` / `AuthCode` /
  `AccessToken`, `mountOidc`, the `AuthStore` seam (the
  app supplies the driver; `take*` are atomic
  get-and-delete so single-use lives in the contract),
  and the app-owned login seam.
- **Sql** — a production-shaped `AuthStore` driver over
  [plgg-sql](/packages/plgg-sql)'s `Db` seam:
  dbmate-style migrations, `sqlStore(db)` (tokens
  stored only as SHA-256 hashes), OAuth 2.1
  refresh-token rotation with family revocation on
  reuse, and signing-key rotation (`rotateSigningKey` /
  `retireKeys`).

## Why it exists

An OIDC provider is usually a heavyweight third-party
dependency. plgg-auth is the from-scratch alternative:
the JOSE math is pinned to RFC vectors and cross-checked
against `node:crypto`, every failure is a typed
`Result` rather than a throw, and the whole thing runs
on WebCrypto with no runtime dependency. Running a real
OP — rather than a bespoke session shim — is what lets
plggpress's [browser login, API tokens, and MCP
authorization](/packages/plggpress/agent-surfaces) all
be standard OAuth flows (decision D6).

The same shared contract spec runs against both the
in-memory and the plgg-sql drivers; the SQL driver is
tested against a real `node:sqlite` database.
