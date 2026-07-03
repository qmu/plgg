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

## Commands

```sh
npm run test      # tsc --noEmit && plgg-test src
npm run coverage  # coverage-gated run (threshold 91)
npm run build     # dist via plgg-bundle
```
