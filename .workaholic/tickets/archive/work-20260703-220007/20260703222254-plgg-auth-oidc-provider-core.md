---
created_at: 2026-07-03T22:22:54+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 2d362bb
category: Added
depends_on: [20260703222252-plgg-auth-jose-layer.md, 20260703222253-plgg-http-cookies-and-form-decoding.md]
---

# plgg-auth OIDC provider core: models, AuthStore seam, endpoints, in-memory store, OP+RP demo

## Overview

Phase 3 of 4. Implement the OIDC provider (OP) core in `packages/plgg-auth` as
an `Oidc/` domain on top of the phase-1 Jose layer and the phase-2 plgg-http
capabilities:

- **Branded models**: `ClientId`, `ClientSecretHash`, `RedirectUri`, `Scope`,
  `State`, `Nonce`, `CodeVerifier`/`CodeChallenge` (PKCE S256 only),
  `AuthorizationRequest`, `AuthorizationCode`, `Subject`, `AccessToken`,
  `IdTokenClaims`, `Client` (registered redirect URIs, allowed scopes,
  public/confidential).
- **AuthStore seam** mirroring plgg-sql's `Db`: a capability record the
  library never implements (clients, authorization codes, sessions, signing
  keys), supplied by the app; ship an in-memory driver in `testkit/`.
- **Endpoints as plgg-server Handlers**, mountable as one sub-app:
  `GET /.well-known/openid-configuration` (discovery), `GET /jwks.json`,
  `GET /authorize` (authorization code flow + PKCE), `POST /token`
  (`authorization_code` grant; `client_secret_basic`/`client_secret_post` for
  confidential clients, `none`+PKCE for public), `GET /userinfo` (Bearer).
- **Login interaction seam**: the OP owns the protocol only. When
  `/authorize` finds no session cookie, it persists the pending
  authorization request and redirects to an app-provided login route; the app
  authenticates however it wants and calls a `completeAuthorization(...)`
  usecase that establishes the session, issues the code, and redirects back
  to the RP. No password handling or login HTML in the library.
- **Runnable OP+RP demo**: `example.ts` wiring two plgg-server apps — an OP
  with a hardcoded demo login route, and an RP that performs the full
  discovery → authorize → code → token → ID-token-validation → userinfo round
  trip.

No implicit/hybrid flows, no refresh tokens yet (phase 4).

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — `Oidc/`
  domain beside `Jose/`, model/usecase split, testkit for the in-memory store.
- `workaholic:implementation` / `policies/coding-standards.md` — no escape
  hatches; every endpoint boundary parses `unknown` via casters.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the
  Oidc domain (validation, code exchange, token issuance) is pure and
  handler-independent; handlers are thin shells; the AuthStore seam inverts
  the infrastructure dependency.
- `workaholic:design` / `policies/auth-procurement.md` — custom OP build;
  deviation rationale recorded in phase 1; authentication (the login seam,
  app-owned) is explicitly separated from authorization (the OP's protocol
  decisions).
- `workaholic:design` / `policies/access-control.md` — one authoritative
  check layer: client/redirect/PKCE/scope validation lives in single domain
  usecases called by every entry point, not scattered per handler.
- `workaholic:design` / `policies/defense-in-depth.md` — validate at every
  boundary; exact-match redirect URIs; single-use, short-lived codes;
  high-entropy tokens via `crypto.getRandomValues`.
- `workaholic:design` / `policies/rest-api-design.md` — spec-accurate HTTP:
  OAuth error responses (`invalid_request`, `invalid_client`, `invalid_grant`,
  `unsupported_grant_type`) with correct statuses; error redirects to the RP
  only when the redirect URI itself validated.
- `workaholic:design` / `policies/data-sovereignty.md` — minimal claims in ID
  token and userinfo; only what a registered scope justifies.
- `workaholic:implementation` / `policies/test.md` — automated in-process e2e
  spec via `handle`; >90% coverage.

## Key Files

- `packages/plgg-server/src/Http/model/Handler.ts` - the exact
  `Handler`/`Middleware` types every endpoint must satisfy
- `packages/plgg-server/src/Http/model/Context.ts` - `param`/`query`/`header`
  accessors and `setState` threading for the authenticated subject
- `packages/plgg-server/src/Routing/model/Web.ts` - `web()/get/post/use/route`
  builders; the OP mounts as a sub-app via `route(basePath, ...)`
- `packages/plgg-server/example.ts` - bearer-middleware pattern to generalize
  for userinfo (`Bearer <token>` → validate → `setState` subject)
- `packages/plgg-sql/src/Db/model/Db.ts` - the seam template AuthStore mirrors
  (capability type + defineVariant error + foldThrown lifting)
- `packages/plgg-db-migration/src/testkit/sqliteDb.ts` - testkit driver
  precedent (coverage-excluded) for the in-memory store
- `packages/plgg-auth/src/Jose/` - phase-1 layer used for ID-token
  sign/verify and JWKS document
- `packages/plgg-http/src/Http/model/Cookie.ts`,
  `Http/usecase/parseForm.ts` - phase-2 capabilities (session cookie; token
  endpoint form body)
- `packages/plgg-server/src/Routing/usecase/handle.ts` - in-process dispatch
  the e2e spec drives (no sockets)

## Related History

The plgg-sql arc (seam + example + adapter contract) is the direct precedent
for AuthStore + demo; the HttpError 401/403 ticket already gave the failure
vocabulary these endpoints return.

Past tickets that touched similar areas:

- [20260627210145-plgg-sql-execscript-seam.md](.workaholic/tickets/archive/work-20260627-205005/20260627210145-plgg-sql-execscript-seam.md) - the Db-seam abstraction AuthStore mirrors
- [20260627210152-example-readme-and-db-adapter-contract.md](.workaholic/tickets/archive/work-20260627-205005/20260627210152-example-readme-and-db-adapter-contract.md) - "runnable example + documented adapter contract" deliverable shape for the OP+RP demo and store contract
- [20260527023825-http-failure-vocabulary.md](.workaholic/tickets/archive/work-20260513-182057/20260527023825-http-failure-vocabulary.md) - 401/403 HttpError vocabulary the endpoints use
- [20260527142356-create-plgg-http-client.md](.workaholic/tickets/archive/plgg-http-client/20260527142356-create-plgg-http-client.md) - typed-client discipline for the RP side of the demo

## Implementation Steps

1. `Oidc/model/`: branded scalars via `refinedBrand` (`ClientId`,
   `RedirectUri` — absolute URI, no fragment; `Scope`; `State`; `Nonce`;
   `CodeVerifier` — RFC 7636 §4.1 grammar; `CodeChallenge`); records
   (`Client`, `AuthorizationRequest`, `AuthorizationCode` with subject,
   client, PKCE challenge, nonce, expiry; `IdTokenClaims`); `OidcError`
   variants carrying the OAuth error code vocabulary.
2. `Oidc/model/AuthStore.ts`: capability record —
   `findClient(ClientId)`, `savePendingRequest`/`takePendingRequest`,
   `saveCode`/`takeCode` (take = atomic single-use consumption),
   `findSession`/`saveSession`, `activeKeys()` — all
   `PromisedResult<..., StoreError>`; `StoreError` via `defineVariant` +
   `toStoreError`.
3. `Oidc/usecase/` pure domain steps: `validateAuthorizationRequest`
   (client lookup, exact redirect_uri match, `response_type=code`, S256
   required for public clients), `verifyPkce` (S256(verifier) ===
   challenge), `authenticateClient` (basic/post secret against
   SHA-256 `ClientSecretHash`, or `none`+PKCE), `issueCode`
   (`crypto.getRandomValues`, TTL ≤ 60s), `issueTokens` (access token +
   RS256 ID token via Jose with `iss/sub/aud/exp/iat/nonce`),
   `discoveryDocument(issuer)`, `jwksDocument(keys)`.
4. `Oidc/http/` handlers + `mountOidc(config)(web)`: thin shells binding
   HTTP to the usecases; authorize sets/reads the session cookie (phase-2
   codec, HttpOnly/Secure/Lax) and redirects to the configured login path
   with a request id when unauthenticated; token endpoint parses
   `parseForm(req.body)`; userinfo is a bearer middleware + handler;
   errors map to OAuth JSON bodies or error redirects per spec.
5. `completeAuthorization` usecase: the app-facing seam — given an
   authenticated `Subject` and pending request id, establish session, issue
   code, return the RP redirect response.
6. `testkit/memoryStore.ts`: full in-memory `AuthStore` driver
   (coverage-excluded, like sqliteDb.ts), used by specs and the demo.
7. `example.ts`: OP app (mountOidc + demo login route with a fixed user) and
   RP app (plgg-fetch driven round trip), runnable via node.
8. Specs: unit specs per model/usecase (stub `Partial<AuthStore>` idiom), plus
   the in-process e2e spec of the Quality Gate.
9. Prettier, coverage, check-all wiring already in place from phase 1.

## Quality Gate

Defaults adopted per ticket interrogation (developer AFK; recommended options
recorded): automated e2e spec + runnable demo.

**Acceptance criteria** — the checkable conditions that must hold:

- An in-process e2e spec drives the full round trip via `handle(app, req)`
  with the in-memory store: fetch discovery → GET /authorize (no session) →
  login-seam completion via `completeAuthorization` → 302 back to the RP
  redirect_uri with `code` and echoed `state` → POST /token with form body +
  PKCE verifier → 200 with `access_token` + `id_token` → the ID token
  verifies against GET /jwks.json and its `iss`/`aud`/`nonce`/`exp` claims
  validate via phase-1 `validateJwt` → GET /userinfo with the access token
  returns the subject's claims.
- Negative paths each return the spec-correct OAuth error: wrong PKCE
  verifier → `invalid_grant`; reused code → `invalid_grant` (single-use);
  expired code → `invalid_grant`; unregistered/mismatched `redirect_uri` →
  error page, **no redirect** to the unvalidated URI; bad client secret →
  `invalid_client` with 401; unknown `grant_type` →
  `unsupported_grant_type`; userinfo without/with invalid bearer → 401.
- `state` round-trips untouched; `nonce` lands in the ID token; codes and
  access tokens are generated from `crypto.getRandomValues` (≥ 128 bits).
- The demo runs: `node --experimental-strip-types example.ts` (or the
  package's established run form) completes the OP+RP round trip and prints
  the validated ID-token claims.
- No `as`/`any`/`ts-ignore` in the package.

**Verification method** — the commands/tests/probes that prove them:

- `cd packages/plgg-auth && npm run coverage` green at threshold 91 with the
  e2e + negative-path specs.
- `scripts/tsc-plgg.sh` green; demo executed once in-session with output
  captured.

**Gate** — what must pass before approval:

- Package coverage green (≥91%), `scripts/check-all.sh` green on a fresh
  rebuild, e2e + all negative-path specs passing, and the runnable demo
  round trip demonstrated.

## Considerations

- plgg-auth gains deps `plgg-http` + `plgg-server` (and `plgg-fetch` as a
  devDep for the RP demo) this phase; keep `Jose/` and `Oidc/model|usecase`
  import-free of plgg-server so the domain stays entry-point-independent
  (`packages/plgg-auth/src/`).
- `takeCode`/`takePendingRequest` are deliberately "take" (get-and-delete)
  seam operations so single-use semantics live in the store contract, not in
  handler sequencing; document this in the AuthStore contract
  (`packages/plgg-auth/src/Oidc/model/AuthStore.ts`).
- Client secrets are stored as SHA-256 hashes; this phase registers clients
  programmatically (no dynamic registration endpoint, no end-user password
  storage anywhere).
- Redirect-URI validation must happen before any error redirect — errors on
  an unvalidated redirect_uri render locally (open-redirect prevention)
  (`packages/plgg-auth/src/Oidc/usecase/validateAuthorizationRequest.ts`).
- Discovery document fields must be internally consistent (issuer prefix on
  every endpoint URL; `code_challenge_methods_supported: ["S256"]`,
  `id_token_signing_alg_values_supported: ["RS256"]`).
- Session representation this phase is a minimal opaque session id in the
  store + cookie; real session policy (lifetime, logout) is phase 4
  (`20260703222255-plgg-auth-persistence-and-hardening.md`).
- Clock is injected (as in phase 1) so code/token expiry specs are
  deterministic.

## Final Report

Development completed as planned. Approval gate auto-resolved: the developer
was away at the per-ticket prompt, and the `/drive` batch was explicitly
authorized in-session ("do it but through phases") with every pre-agreed
Quality Gate criterion verified green.

### Discovered Insights

- **Insight**: The `/authorize` orchestration is split into a pure `authorize` usecase returning an `AuthorizeOutcome` union (`LoginRequired` | `RedirectToClient` | `LocalError`) that the thin HTTP handler folds to responses — so the entire redirect-vs-local-error decision (the open-redirect-prevention rule) is unit-testable without HTTP.
  **Context**: The `LocalError` variant exists specifically because an error discovered *before* the redirect_uri is validated must never be sent to that URI; keeping it a domain value rather than an HTTP concern makes that security boundary a type, not a convention.
- **Insight**: Single-use semantics live entirely in the `AuthStore` seam via `take*` (get-and-delete) operations, not in handler sequencing — `takeCode`/`takePendingRequest` are the contract. The phase-4 SQL driver must implement these atomically (SELECT+DELETE in one transaction) or codes become replayable.
  **Context**: The in-memory driver gets this for free (Map delete); a naive SQL driver that does findThenDelete in two statements would reintroduce the vulnerability the seam design prevents.
- **Insight**: `authorize` reuses the same `completeAuthorization` seam the app's login route calls — when a live session cookie is present it parks a pending request and immediately completes it, rather than duplicating code-issuance logic. One issuance path, two entry points.
  **Context**: This keeps the "already logged in" fast path and the "just logged in" path behaviorally identical; a divergence would be a source of subtle session/nonce bugs.
- **Insight**: Achieving >91% branch coverage on the async-shell usecases required a per-method `overrideStore(base, {method: boom})` testkit helper to exercise every store-failure short-circuit; a whole-store-failing fixture only reaches the first read.
  **Context**: The `isErr(saved)` guards after each `liftStore` write are otherwise unreachable, and they are exactly the branches that matter for graceful degradation under a failing database.
