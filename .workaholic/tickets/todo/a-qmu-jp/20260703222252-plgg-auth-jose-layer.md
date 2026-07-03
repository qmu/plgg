---
created_at: 2026-07-03T22:22:52+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Create `plgg-auth` package with the Jose domain layer (base64url, JWK/JWKS, JWS RS256, JWT)

## Overview

Phase 1 of 4 of the plgg-auth OIDC-provider effort. Scaffold a new
`packages/plgg-auth` package (copying the plgg-sql scaffold) and implement its
`Jose/` domain layer only — no HTTP surface, no endpoints:

- **Base64url** codec (RFC 4648 §5, unpadded): `Uint8Array ↔ string`, building
  on the byte↔string loop pattern in plgg core's `Bin` (not the spread-based
  `btoa(String.fromCharCode(...))`, which overflows the call stack on large
  inputs).
- **Jwk / Jwks** model: RSA public/private JWK (kty/n/e/d/p/q/dp/dq/qi),
  `kid` derived as the RFC 7638 JWK thumbprint (SHA-256), RSA-2048 key-pair
  generation, import/export via WebCrypto `crypto.subtle`
  (RSASSA-PKCS1-v1_5 / SHA-256), and a `Jwks` set with lookup by `kid`.
- **JWS** (RFC 7515, compact serialization): `sign` and `verify` for RS256,
  errors as tagged variants riding the `Result` channel.
- **Jwt** claims model (RFC 7519): typed claims (`iss`, `sub`, `aud`, `exp`,
  `iat`, `nbf`, `nonce`, …), `encodeJwt` (claims + key → compact JWS),
  `decodeJwt` (parse without verification), and `validateJwt` (signature via
  JWKS + `iss`/`aud`/`exp`/`nbf`/`nonce` checks, clock passed in as a
  parameter — no `Date.now()` inside the domain).

Built exclusively on WebCrypto (`crypto.subtle`, `crypto.getRandomValues`) so
the package stays runtime-neutral across node/bun/deno like the rest of the
stack. Zero runtime dependencies beyond `plgg` (vendor-neutrality policy: this
package is the recorded, deliberate alternative to procuring a third-party
`jose`/`oidc-provider` library — see Considerations).

This layer underpins phase 3 (ID-token issuance) and is independently useful
for verifying third-party tokens (relying-party direction).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — new package
  under `packages/`, `src/<Domain>/model|usecase` layout, index.ts barrels.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`/`throw`/`null`; Option/Result; exhaustive matching.
- `workaholic:implementation` / `policies/type-driven-design.md` — branded
  types for base64url strings, `kid`, compact JWS; parse `unknown` at
  boundaries with casters.
- `workaholic:implementation` / `policies/functional-programming.md` — pure
  claim validation and JWS assembly; `crypto.subtle` calls isolated as thin
  async shells composed with `proc`.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the rationale
  for building Jose in-house on plgg + WebCrypto with zero third-party runtime
  deps.
- `workaholic:design` / `policies/auth-procurement.md` — custom auth build is a
  documented deviation from default-to-procure; this ticket records the
  justification (vendor-neutrality, plgg as self-maintained foundation,
  plgg is its own only consumer).
- `workaholic:implementation` / `policies/test.md` — test against the real
  thing: real `crypto.subtle`, RFC test vectors, node:crypto cross-check;
  >90% coverage.
- `workaholic:implementation` / `policies/command-scripts.md` — wire into the
  canonical runners (build.sh / check-all.sh), no bespoke one-off scripts.

## Key Files

- `packages/plgg-sql/package.json` - scaffold template (name, scripts, exports
  map, `file:../plgg` dep, plgg-bundle/plgg-test/typescript devDeps)
- `packages/plgg-sql/tsconfig.json`, `tsconfig.build.json`,
  `bundle.config.ts`, `plgg-test.config.json`, `.prettierrc.json` - copy
  verbatim, changing the alias prefix to `plgg-auth` (coverage threshold 91,
  printWidth 50)
- `packages/plgg-sql/src/index.ts` - barrel style: one export line per domain
- `packages/plgg/src/Atomics/Bin.ts` - existing base64 codec; base64url builds
  on its byte-loop pattern (lines 118-141)
- `packages/plgg/src/Grammaticals/RefinedBrand.ts` - `refinedBrand(tag,
  qualify, errorFor)` for the branded scalars (Base64UrlStr, Kid, CompactJws)
- `packages/plgg/src/Contextuals/Variant.ts` - `defineVariant` for the
  `JoseError` tagged-union error type
- `packages/plgg-db-migration/src/domain/model/Version.ts` - canonical
  real-world `refinedBrand` usage to copy
- `packages/plgg-sql/src/Db/usecase/query.spec.ts` - test authoring style
  (plgg-test data-last matchers, `okThen`/`errThen`, return the assertion)
- `scripts/build.sh`, `scripts/check-all.sh` - wire the new package in
  dependency order with per-package test + coverage runners

## Related History

The repo has a repeatable new-package pattern (plgg-sql, plgg-http,
plgg-router arc); nothing auth/crypto-shaped exists yet, so this is greenfield
domain territory.

Past tickets that touched similar areas:

- [20260527142355-create-plgg-sql-builder.md](.workaholic/tickets/archive/plgg-sql/20260527142355-create-plgg-sql-builder.md) - canonical template for standing up a new packages/plgg-* POC package (same scaffold this ticket copies)
- [20260627210147-domain-models.md](.workaholic/tickets/archive/work-20260627-205005/20260627210147-domain-models.md) - "pure domain vocabulary first" branded-model discipline this Jose layer follows
- [20260630013513-wire-new-packages-into-gate.md](.workaholic/tickets/archive/work-20260630-013457/20260630013513-wire-new-packages-into-gate.md) - mandatory integration of a new package into build.sh ordering and check-all.sh runners

## Implementation Steps

1. Scaffold `packages/plgg-auth` from the plgg-sql template: `package.json`
   (dep: `plgg` only), `tsconfig.json` (+`.build`), `bundle.config.ts`
   (alias prefix `plgg-auth`), `plgg-test.config.json` (threshold 91),
   `.prettierrc.json` (printWidth 50), `src/index.ts` barrel.
2. `Jose/model/JoseError.ts`: `defineVariant`-based error union
   (e.g. `DecodeError`, `KeyError`, `SignError`, `VerifyError`,
   `ClaimError`) with constructors, patterns, and a `foldThrown`-based
   `toJoseError` for lifting rejected `crypto.subtle` promises.
3. `Jose/model/Base64Url.ts`: `encodeBase64Url(bytes): Base64UrlStr` and
   `decodeBase64Url(str): Result<Uint8Array, JoseError>`; branded
   `Base64UrlStr` via `refinedBrand` (charset/padding qualify). Use an
   explicit byte loop (no spread) per `Bin.ts`'s `fromJsonReady` pattern.
4. `Jose/model/Jwk.ts`: typed `RsaPublicJwk`/`RsaPrivateJwk` records with
   casters from `unknown` (boundary parse); `Jose/usecase/generateRsaKey.ts`
   (`crypto.subtle.generateKey` RSASSA-PKCS1-v1_5, 2048, SHA-256, extractable);
   import/export between JWK and `CryptoKey`; `Jose/usecase/thumbprint.ts`
   (RFC 7638 SHA-256 thumbprint → branded `Kid`).
5. `Jose/model/Jwks.ts`: key set (`keys: Vec<RsaPublicJwk>`), `findByKid`
   returning `Option`, JSON-ready codec for serving as a JWKS document later.
6. `Jose/usecase/signJws.ts` / `verifyJws.ts`: RFC 7515 compact serialization
   for RS256 — protected header (`alg`, `kid`), base64url(header).base64url
   (payload).base64url(signature); verify returns
   `PromisedResult<Uint8Array payload, JoseError>` and rejects `alg` values
   other than RS256 (no `alg: none`, no downgrade).
7. `Jose/model/JwtClaims.ts` + `Jose/usecase/encodeJwt.ts`, `decodeJwt.ts`,
   `validateJwt.ts`: typed claims record; validation takes
   `{ issuer, audience, clock, nonce? }` and checks signature (via Jwks kid
   lookup), `iss`, `aud` (string or array), `exp`/`nbf` with a small
   leeway parameter, and `nonce` when expected. Each failed check is a
   distinct `ClaimError` value.
8. Specs colocated per model/usecase file, including the Quality Gate's RFC
   vectors and node:crypto cross-checks.
9. Wire `plgg-auth` into `scripts/build.sh` (dependency order, after plgg) and
   `scripts/check-all.sh` (test + coverage runners), following the
   wire-new-packages-into-gate precedent.
10. Format with Prettier; verify with `scripts/tsc-plgg.sh` and the package
    coverage run.

## Quality Gate

Defaults adopted per ticket interrogation (developer AFK; recommended options
recorded): RFC-vector + node:crypto cross-check proof, full check-all gate.

**Acceptance criteria** — the checkable conditions that must hold:

- Base64url encode/decode matches RFC 4648 §5 test vectors (unpadded), and
  `decodeBase64Url` returns `Err` (not a throw) on invalid charset/padding.
- The RFC 7515 Appendix A.2 RS256 example verifies: given the A.2 JWK and
  compact JWS, `verifyJws` returns `Ok` with the example payload; a
  one-byte-tampered signature or payload returns `Err`.
- Cross-check both directions with zero new deps: a JWS signed by our
  `signJws` verifies via `node:crypto` (`crypto.verify`/`createVerify`), and a
  signature produced via `node:crypto` verifies through our `verifyJws`.
- RFC 7638 §3.1 thumbprint example produces the documented `kid` value.
- `validateJwt` returns distinct `Err` values for: expired `exp`, premature
  `nbf`, wrong `iss`, wrong `aud`, wrong/missing expected `nonce`, unknown
  `kid`, and `alg` ≠ RS256 (including `none`); and `Ok` for a valid token.
- No `as`, `any`, or `ts-ignore` anywhere in the package
  (`grep -rnE '\bas\b|\bany\b|ts-ignore' packages/plgg-auth/src` audited in
  review; type-level `as const` is not used either).

**Verification method** — the commands/tests/probes that prove them:

- `cd packages/plgg-auth && npm run coverage` — `tsc --noEmit` plus
  `plgg-test src --coverage` green at threshold 91, with colocated `*.spec.ts`
  asserting every criterion above (real `crypto.subtle`, no mocks).
- `scripts/tsc-plgg.sh` green.

**Gate** — what must pass before approval:

- Package coverage run green (≥91%), `scripts/check-all.sh` green on a fresh
  rebuild with plgg-auth wired into `scripts/build.sh` ordering, and the RFC
  vector + node:crypto cross-check specs present and passing.

## Considerations

- Multiple `crypto.subtle` ops are promise-returning; keep the pure JWS
  assembly (header/payload serialization, claim checks) separate from the
  async signing shell so coverage of the pure parts is cheap
  (`packages/plgg-auth/src/Jose/usecase/`).
- Do not use the spread-based `btoa(String.fromCharCode(...bytes))` idiom from
  `Bin.ts` for potentially large inputs — RSA keys/signatures exceed safe
  argument counts; use an explicit loop (`packages/plgg/src/Atomics/Bin.ts`
  lines 118-141 show both idioms).
- `crypto.subtle` typing comes from `@types/node`'s webcrypto global under
  `lib: ["ES2021"]` + `types: ["node"]`; confirm the global `crypto` is typed
  without adding `DOM` to lib (`packages/plgg-sql/tsconfig.json` as baseline).
- `validateJwt` must take the clock as a parameter (no `Date.now()` in domain
  code) so expiry tests are deterministic.
- Auth-procurement deviation record: we build rather than procure because plgg
  is a self-maintained, zero-third-party-runtime-dep foundation and its own
  only consumer; a `jose` npm dependency would violate vendor neutrality. This
  ticket is the documented justification the policy requires.
- Root runner scripts currently cover `packages/plgg` only; the check-all.sh
  wiring (step 9) is what makes this package's gate enforceable in CI
  (`scripts/check-all.sh`).
- Phase 3 (`20260703222254-plgg-auth-oidc-provider-core.md`) consumes this
  layer for ID-token issuance; keep the Jose surface free of any OIDC-specific
  vocabulary.
