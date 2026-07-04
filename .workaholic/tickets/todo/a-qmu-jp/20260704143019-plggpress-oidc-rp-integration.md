---
created_at: 2026-07-04T14:30:19+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143014-plggpress-serve-mode-dual-config.md, 20260704143018-account-domain-roles-and-invites.md]
---

# plggpress OP+RP dogfooding: mount plgg-auth's OIDC provider, log in against itself (auth-code + PKCE), scope an admin session, and guard the admin subtree with role/scope middleware + CSRF

## Overview

Phase 6 (Auth & admin), ticket **19** of the plggpress/plggmatic roadmap —
the ticket where the served plggpress instance actually authenticates humans.
Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

This ticket implements **D6** verbatim: *"Auth topology — plggpress consumes
plgg-auth as a real OIDC OP (self-hosted IdP, OP+RP dogfooding). Chosen over a
lighter session layer. This makes MCP-over-HTTP authorization and API-token
issuance standard OAuth flows."* Concretely, the one served process
(ticket 14's `serve` verb) plays **both roles at once**: it **mounts the OIDC
Provider** (`mountOidc` over the served `Web`) AND it is that provider's own
**Relying Party** — the `/admin` subtree drives a full authorization-code +
PKCE login flow *against endpoints in the same process*, validates the returned
ID token through the provider's own JWKS, and establishes an application session
scoped to the admin subtree. Dogfooding the OP as an RP is the point: it proves
the provider is a real OAuth server (not a bespoke session shim), and it is the
exact substrate ticket 27 (`plgg-mcp-http-oauth`, per **D15**: *"streamable
HTTP + OAuth (via our own OP, D6) second"*) and API-token issuance later stand
on.

This ticket sits on two dependencies:

- **Ticket 14 (`serve` mode)** established the persistent `node:http` instance
  and, crucially, the **mount seam** `packages/plggpress/src/server/pressServer.ts`
  whose docstring already names the future `route("/auth", …)` and
  `route("/admin", …)` mounts and whose contract is: *"this — and only this —
  is where later tickets compose"* those sub-apps, using plgg-server's
  `route(basePath, sub)` which **scopes a sub-app's middleware to its prefix**
  (`packages/plgg-server/src/Routing/model/Web.ts`, `route`). This ticket lands
  its OP + RP + admin mounts there and nowhere else.
- **Ticket 18 (account domain)** supplied the password→`Subject`
  authentication (`authenticate`), the instantly-revocable `roleOf` membership
  predicate over the closed `Role = "admin" | "guest"` union, invite redemption,
  and (per D7) filled plgg-auth's *"the provider never sees a password"* login
  seam (`completeAuthorization`). This ticket is the HTTP layer ticket 18
  deliberately deferred: *"the HTTP login route, session cookie issuance, CSRF
  tokens … belong to ticket 19/20."*

**Why an RP client must be extracted here.** No packaged Relying-Party helper
exists in the monorepo. The complete RP dance — build a PKCE `code_verifier` +
`S256` challenge, assemble the `/authorize` URL with `state`+`nonce`, follow
the login redirect, read `code`+`state` off the callback, POST the token
exchange with the `code_verifier`, then `validateJwt` the `id_token` through the
OP's JWKS — currently lives **only as an inline, throw-on-error script** in
`packages/plgg-auth/example.ts` (lines ~231–367). That script is not reusable
(it uses a local `must()` that throws, hard-codes the demo client, and inlines
URL string-building). So **part of this ticket is to extract a reusable,
Result-typed RP client into plgg-auth** (a new `Rp` feature), transport-agnostic
so the dogfooding instance can drive the exchange **in-process** (inject the
served app's own `handle`) while the same client also works over a real socket
later. plggpress then consumes that client; example.ts is refactored onto it so
the dance has exactly one implementation.

Hard scope fences (siblings own the rest — do NOT build here):
- The **account domain itself** (accounts table, password hashing,
  `authenticate`, `roleOf`, invites) is ticket 18 — consumed, not reimplemented.
- The **admin UI on the scheduler** (login form markup, invite-generation
  screen, role-management screen rendered via the phase-4 scheduler) is
  ticket 20. This ticket ships the *routes, guards, session, and CSRF
  machinery* the admin UI mounts into, plus the minimal server-rendered
  login/logout pages needed to exercise the flow end to end; the scheduler-based
  chrome is ticket 20's.
- The **API delivery surface** (`/api`) is ticket 16; this ticket only proves
  the guard middleware is reusable so ticket 16/27 can reuse it verbatim.

Zero **new third-party** dependencies: plgg-auth and plgg-sql are existing
in-repo packages added to plggpress as `file:` deps (the same move the absorb
ticket made when plggpress took direct plgg-* deps); no npm registry package
enters any `package.json`, and no native binding is introduced.

## Policies

- `workaholic:design` / `policies/security.md` — the policy snapshot still
  reads *"No role-based or attribute-based access control exists … no server,
  no user database, and no permission model"* and *"No session management,
  token refresh, or multi-factor authentication mechanisms exist."* Ticket 18
  moved the credential-store and RBAC-predicate lines; **this ticket moves the
  session-management and authorization-enforcement lines** — it is the first
  place the monorepo issues a login session, enforces a permission at an HTTP
  boundary, and protects a state-changing form. The policy's discipline governs
  every choice here: the RP session cookie starts from the `sessionCookie`
  secure baseline (`Path`, `HttpOnly; Secure; SameSite=Lax` —
  `packages/plgg-http/src/Http/model/Cookie.ts`) and is scoped to the admin
  subtree; secrets (session ids, PKCE verifiers, CSRF tokens) never appear in a
  URL or a log; every failure is a typed `Result`, never a throw. The phase-6
  gate — *"authorization-boundary tests (anonymous/guest/admin) on every
  admin/API route; CSRF coverage"* — is this ticket's Quality Gate.
- `workaholic:design` / `policies/security.md` (authorization sub-clause) — the
  guard middleware must never *fail open*. A missing session, an unresolvable
  `Subject`, a revoked membership (ticket 18's `revokeRole` is a single
  `DELETE`, so a role can vanish mid-session) all resolve to 401/403 through an
  exhaustive `match` on `Option<Role>`; there is no default-allow branch. This
  is the enforcement mechanism the updated policy will cite.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer; `as`/`any`/`ts-ignore` are prohibited. The
  guard resolves a closed `Role` union with exhaustive `match`, so adding a
  future role (or forgetting a branch) is a `tsc` error, not a silent
  authorization gap — load-bearing for a security boundary. The RP client's
  outcomes (state-mismatch, token-exchange failure, invalid ID token, expired
  session) are a closed discriminated error union consumed exhaustively.
  Prettier `printWidth: 50` governs every touched `.ts`.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package (fused `tsc --noEmit && plgg-test`, >90 across
  statements/branches/functions/lines). The authorization-boundary matrix
  (anonymous / guest / admin × every guarded route) and the CSRF accept/reject
  cases are enumerated as required specs, not left to line-count luck; the RP
  client is driven headlessly through the in-process transport so the whole
  round trip is covered without a socket.

## Key Files

**The mount seam (extend — the one composition point, from ticket 14):**

- `packages/plggpress/src/server/pressServer.ts` — `pressServeWeb(...)`; ticket
  14's docstring already reserves `route("/auth", …)` and `route("/admin", …)`
  here. This ticket composes the OP mount, the RP/login routes, and the guarded
  admin sub-app into it. **This is the only place the mounts may live.**
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`
  (prefix-scoped middleware) and `use(mw)`; the admin guard is a sub-app `use`
  so it runs for `/admin/*` and nowhere else (reader routes stay untouched).
  Consumed; the generic guard/CSRF middleware are *added* to this package
  (see below).
- `packages/plgg-server/src/Http/model/Handler.ts` — `Handler`, `Middleware`
  (`(c, next) => …`), `Next`; the guard and CSRF middleware are authored to
  this shape.
- `packages/plgg-server/src/Http/model/Context.ts` — `Context`,
  `getState`/`setState` (immutable state bag threaded through `next`); the guard
  writes the resolved `Subject`/`Role` into state for downstream handlers.

**The OP being mounted (consumed, not modified):**

- `packages/plgg-auth/src/Oidc/http/mountOidc.ts` — `mountOidc(config)(web())`
  installs discovery, JWKS, `/authorize`, `/token`, `/userinfo`; `SESSION_COOKIE`
  (`plgg_auth_session`), `sessionRedirect`, and the note that *"The app still
  owns the login route the config points `loginPath` at."* The app-owned login
  route is what this ticket builds (it calls ticket 18's `authenticate` then
  `completeAuthorization`).
- `packages/plgg-auth/src/Oidc/usecase/completeAuthorization.ts` — the login
  seam `(config)(pendingId, subject)` ticket 18 fills with a verified `Subject`;
  the login route wires `authenticate` → `completeAuthorization` →
  `sessionRedirect`.
- `packages/plgg-auth/src/Oidc/model/ProviderConfig.ts` — `ProviderConfig`
  (issuer, `loginPath`, `store`, TTLs, `clock`), `oidcPaths`, `discoveryDocument`;
  the served instance builds one `ProviderConfig` from its serve config.
- `packages/plgg-auth/src/Oidc/model/Pkce.ts` — `CodeVerifier`, `asCodeVerifier`,
  `computeS256Challenge`; the RP client's PKCE half.
- `packages/plgg-auth/src/Oidc/model/Tokens.ts` — `Subject`/`asSubject` (the
  identity the RP session carries) and the CSPRNG entropy pattern
  (`freshOpaque()`) the RP `state` and RP session id reuse.
- `packages/plgg-auth/src/Jose/usecase/validateJwt.ts` — ID-token validation
  (issuer/audience/nonce/leeway against the JWKS); the RP client's final step.
- `packages/plgg-auth/src/Oidc/model/AuthStore.ts` — `Session`/`SessionId` and
  the *"`take*` is get-AND-delete in one transaction"* contract; the RP session
  store mirrors this shape.

**The RP dance to extract (refactor onto the new client):**

- `packages/plgg-auth/example.ts` (lines ~231–367) — the inline,
  throw-on-error RP script (`must()`, hand-built authorize URL, manual token
  POST, `validateJwt`). Its logic is lifted into the new `Rp` feature; the
  example is rewritten to call the client so there is one implementation.

**Transport seam for in-process dogfooding (consumed):**

- `packages/plgg-server/src/Routing/usecase/handle.ts` — `handle(app, request)`
  answers an `HttpRequest` with no socket; the RP client's injected transport in
  the served instance is `(req) => handle(op, req)`, so login talks to the OP
  in-process (example.ts already proves this pattern with `call = (r) =>
  handle(op, r)`).
- `packages/plgg-fetch/src/Http/usecase/request.ts` — the `Result`-typed HTTP
  client the RP transport seam is shaped after (so the same client works over a
  real socket when OP and RP are separate processes later).

**Cookies / forms (consumed):**

- `packages/plgg-http/src/Http/model/Cookie.ts` — `sessionCookie` (secure
  baseline), `withPath`/`withMaxAge`, `getCookie`, `withSetCookie`; the RP
  session and CSRF cookies are built here. Note `withSetCookie` returns a
  `Result` (serialization can fail) — folded, never thrown.
- `packages/plgg-http/src/Http/model/Form.ts` — `parseForm`; login/logout/redeem
  posts are `application/x-www-form-urlencoded`, decoded here, then CSRF-checked.

**Files created (proposed — design step may amend names):**

- `packages/plgg-auth/src/Rp/model/RpConfig.ts` — the RP client config
  (client id, redirect URI, issuer/discovery base, expected audience, `clock`,
  leeway).
- `packages/plgg-auth/src/Rp/model/RpError.ts` — the closed RP error union
  (`state_mismatch`, `missing_code`, `token_exchange_failed`,
  `invalid_id_token`, `transport_failed`) + code/message helpers.
- `packages/plgg-auth/src/Rp/model/RpTransport.ts` — the injectable transport
  seam: `(HttpRequest) => Promise<Result<HttpResponse, RpError>>` (in-process
  `handle` or a socket `request`).
- `packages/plgg-auth/src/Rp/usecase/beginLogin.ts` — mint `code_verifier`
  (+ `S256` challenge), `state`, `nonce`; return the authorize URL to redirect
  to **and** the transient values to stash (server-side, keyed by `state`).
- `packages/plgg-auth/src/Rp/usecase/completeLogin.ts` — given the callback
  query + the stashed verifier/nonce, verify `state`, POST the token exchange
  through the transport, `validateJwt` the ID token, return
  `Result<{ subject, claims, tokens }, RpError>`.
- `packages/plgg-auth/src/Rp/testkit/inProcessTransport.ts` — a `handle`-backed
  transport for specs and the dogfooding instance.
- `packages/plgg-auth/src/Rp/index.ts` — feature barrel; wired into
  `packages/plgg-auth/src/index.ts` (today `export *` of Jose|Oidc|Sql|Account).
- `packages/plgg-server/src/Routing/usecase/requireRole.ts` — the generic,
  **auth-agnostic** authorization middleware (below), + `requireScope.ts`.
- `packages/plgg-server/src/Routing/usecase/csrf.ts` — the generic CSRF
  middleware (double-submit token) + token minting helper.
- `packages/plggpress/src/auth/pressAuth.ts` — plggpress's wiring: builds the
  `ProviderConfig` + `RpConfig` from serve config, the app-owned login/logout
  routes, the RP session store + admin-scoped cookie, and the guarded `/admin`
  sub-app; consumed by `pressServer.ts`.
- `packages/plggpress/src/auth/rpSessionStore.ts` (+ SQL driver) — the RP
  application-session store (opaque id → `Subject`, expiry), a `take*`-shaped
  seam over plgg-sql, distinct from the OP `Session`.
- Colocated `.spec.ts` beside every module above.

**Manifests / wiring (verify — no new third-party dep, no runner-script churn):**

- `packages/plggpress/package.json` — add `"plgg-auth": "file:../plgg-auth"`
  and `"plgg-sql": "file:../plgg-sql"` to `dependencies` (the RP client, OP
  mount, account domain, and RP session store). Externals are **derived from
  package.json** (`packages/plggpress/bundle.config.ts` says so — *"Externals …
  are derived from package.json, never listed here"*), so **no `bundle.config.ts`
  edit** is needed, and `tsconfig.json` `paths` only self-aliases `plggpress/*`
  (deps resolve via `node_modules`), so **no `tsconfig` edit** either.
- `scripts/build.sh` / `scripts/npm-install.sh` / `scripts/check-all.sh` —
  plggpress, plgg-auth, and plgg-sql are **all already wired**; plgg-auth and
  plgg-sql already build **before** plggpress in `build.sh` order (plggpress is
  near the tail). **Verify** the order still satisfies the new dep edge; do
  **not** edit the runner scripts otherwise.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`,
  `.workaholic/policies/security.md` — the decision record and the policy this
  ticket updates the reality behind.

## Related History

This ticket is where three recently-built layers converge into a running login:

- `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  (dependency) — the `serve` verb and the `pressServer.ts` mount seam; its
  Considerations explicitly say *"the first real mount (ticket 16) must land
  inside `pressServer.ts` … and when D6's OIDC OP arrives, re-examine whether
  serve needs graceful-shutdown hooks (in-flight auth flows)."* This is that
  arrival — honor the seam and the graceful-shutdown note.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143018-account-domain-roles-and-invites.md`
  (dependency) — `authenticate`, `roleOf`, invites, and the filled
  `completeAuthorization` seam; its Considerations defer *"the HTTP login
  route, session cookie issuance, CSRF tokens, and the copy-paste-link UI"* to
  this ticket. Consume its `roleOf` predicate as the guard's decision source.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222254-plgg-auth-oidc-provider-core.md`
  and `…/20260703222253-plgg-http-cookies-and-form-decoding.md`
  (story `.workaholic/stories/work-20260703-220007.md`) — the OP core (`mountOidc`,
  `completeAuthorization`, `sessionRedirect`) and the cookies/form machinery a
  login/logout/redeem route needs; both were deliberately left unconsumed by
  plggpress until now.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222255-plgg-auth-persistence-and-hardening.md`
  — the atomic `take*` and refresh-token hash-at-rest discipline; the RP session
  store copies `takeFrom`'s single-transaction get-AND-delete for logout/rotation.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — the precedent for
  plggpress taking direct `file:` plgg-* deps and for externals being derived
  from package.json; adding plgg-auth/plgg-sql follows that exact pattern.
- Concern `.workaholic/concerns/51-carried-from-pr-47-export-surface.md` — plgg-bundle
  discovers exports by executing the built bundle. plgg-auth/plgg-sql become
  new *runtime* deps plggpress's bundle surface-requires; keep their barrels
  ESM-import-and-default clean (the roadmap's *"plggpress export map needs
  types+default entries for require() consumers"* note) so the surface probe
  doesn't regress. Verify with a fresh `check-all.sh`.
- Downstream: ticket 20 (`admin-ui-on-scheduler`) renders the login/invite/role
  UI into the routes this ticket defines; ticket 27 (`plgg-mcp-http-oauth`)
  reuses this OP for OAuth-protected MCP-over-HTTP; ticket 16 (`/api`) reuses
  `requireScope`. Keep all three seams UI- and transport-agnostic.

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Write a short design
   note (PR description or a `.workaholic/specs/` sketch) fixing: (a) the **RP
   client shape** — the transport seam, `RpConfig`, the `beginLogin`/`completeLogin`
   split, and the closed `RpError` union; (b) the **RP session model** — an
   opaque CSPRNG session id (`freshOpaque()` pattern) mapped server-side to a
   `Subject` + expiry, cookie **scoped to `Path=/admin`** on the `sessionCookie`
   secure baseline, distinct from the OP `plgg_auth_session`; state rationale:
   *why the RP session is separate from the OP SSO session* (the OP session
   authenticates the human to the IdP; the RP session authorizes the admin app);
   (c) the **CSRF scheme** — double-submit token (a non-`HttpOnly` CSRF cookie +
   a hidden form field / header compared in constant time), applied to every
   state-changing POST (login, logout, invite-redeem); (d) the **guard
   placement** — `requireRole`/`requireScope` generic in plgg-server,
   parameterized by a resolver so **plgg-server never imports plgg-auth**
   (layering); plggpress supplies the resolver from `roleOf`. Present at the
   drive approval gate; implement after agreement.

2. **Extract the RP client into plgg-auth (`src/Rp/`).**
   - `RpTransport.ts`: `type RpTransport = (req: HttpRequest) =>
     Promise<Result<HttpResponse, RpError>>`.
   - `RpConfig.ts`: client id, redirect URI, issuer + endpoint paths (or a
     discovery step), expected audience, `clock`, `leewaySeconds`.
   - `beginLogin.ts`: `beginLogin(config)()` → mint `CodeVerifier` +
     `computeS256Challenge`, a CSPRNG `state` and `nonce`; return
     `{ authorizeUrl, verifier, state, nonce }` (the authorizeUrl assembled with
     `URLSearchParams`, never string concatenation of unescaped values).
   - `completeLogin.ts`: `completeLogin(config, transport)(callbackQuery,
     stashed)` → verify `callbackQuery.state === stashed.state`
     (`state_mismatch` else), read `code` (`missing_code` else), POST the token
     exchange through `transport` with the `code_verifier`
     (`token_exchange_failed` on non-200 / error body), `validateJwt` the
     `id_token` against the OP JWKS with issuer/audience/`nonce`/leeway
     (`invalid_id_token` else), return
     `Result<{ subject: Subject; claims; tokens }, RpError>`. Every step folds
     through `Result`/`proc` — no throw, no `must()`.
   - `testkit/inProcessTransport.ts`: `(op: Web) => RpTransport` built on
     `handle`.
   - Refactor `packages/plgg-auth/example.ts` to call `beginLogin` +
     `completeLogin` over the in-process transport, deleting the inline
     `must()`-based dance (one implementation, and the example becomes the RP
     client's living demo).

3. **Generic authorization middleware in plgg-server.**
   `requireRole.ts`: `requireRole<R>(resolve: (c: Context) =>
   Promise<Option<R>>, allowed: (r: R) => boolean): Middleware` — resolve the
   principal's role from the request (cookie/session), `matchOption`: `None` →
   401 (unauthenticated), `Some(role)` where `!allowed(role)` → 403 (forbidden),
   else `setState` the principal and call `next`. **No default-allow branch.**
   `requireScope.ts`: the same shape over an OAuth scope set (for ticket 16/27's
   token-authenticated routes). Both stay **auth-agnostic** — plgg-server gains
   no plgg-auth dependency; the resolver is injected. Add to
   `Routing/usecase/index.ts` and the plgg-server barrel.

4. **Generic CSRF middleware in plgg-server (`csrf.ts`).** `issueCsrfToken()`
   mints a CSPRNG token; `csrfCookie(token)` builds the non-`HttpOnly`,
   `SameSite=Strict`, `Path`-scoped cookie; `requireCsrf: Middleware` on unsafe
   methods reads the cookie token and the submitted token (form field or
   `X-CSRF-Token` header) and compares them **constant-time** (XOR-accumulate,
   as ticket 18's password verify does) → 403 on mismatch/absence, else `next`.
   Generic (no auth coupling) so any state-changing plggpress form reuses it.

5. **RP session store (`packages/plggpress/src/auth/rpSessionStore.ts`).** A
   `take*`-shaped seam (`saveRpSession`, `findRpSession`, `takeRpSession`) over
   plgg-sql's `Db`, mirroring `AuthStore`/`sqlStore` (bound `sql` values,
   `takeRpSession` = SELECT+DELETE in one `begin`/`commit`/rollback for logout).
   Schema DDL via `execScript`: `rp_sessions (id TEXT PRIMARY KEY, subject TEXT
   NOT NULL, expires_at INTEGER NOT NULL)`. Store only the opaque id; the cookie
   carries the id, never the `Subject`. Add an in-memory testkit driver.

6. **plggpress auth wiring (`packages/plggpress/src/auth/pressAuth.ts`).**
   - Build one `ProviderConfig` from the serve config (issuer from the served
     origin, `loginPath = "/auth/login"`, the plgg-sql-backed `AuthStore` +
     account domain sharing the same `Db`, TTLs, `clock`).
   - **OP mount:** `mountOidc(config)` under `route("/auth", …)`.
   - **App-owned login route** (`GET /auth/login` renders a minimal
     server-side form with a CSRF token + the `request_id`; `POST /auth/login`
     CSRF-checks, `parseForm`, calls ticket 18's `authenticate(store)(username,
     password)` → `Some(subject)` → `completeAuthorization(config)(pendingId,
     subject)` → `sessionRedirect`; `None` → re-render with a generic error, no
     enumeration oracle).
   - **RP self-login for the admin subtree:** a `GET /admin/login` that
     `beginLogin`s (stashing verifier/state/nonce in the RP session store keyed
     by `state`) and 302s to `/auth/authorize`; a `GET /admin/callback` that
     `completeLogin`s over the **in-process** transport (`handle(op, …)`),
     mints an RP session, and 302s into `/admin` with the admin-scoped session
     cookie.
   - **Logout** (`POST /admin/logout`, CSRF-checked): `takeRpSession` (burns
     the server-side session) + a `Max-Age=0` clear of the admin cookie.
   - **Guarded admin sub-app:** a `Web` whose `use(requireRole(resolveAdmin,
     r => r === "admin"))` guard resolves the RP session cookie → `Subject` →
     `roleOf(subject)`; mounted `route("/admin", adminApp)` so the guard scopes
     to `/admin/*` only. Guest-only areas (ticket 21+) mount with
     `allowed: r => r === "admin" || r === "guest"`.

7. **Compose into the seam (`pressServer.ts`).** In `pressServeWeb`, pipe the
   reader `pressRouter` with `route("/auth", …)`, the login/logout routes, and
   `route("/admin", guardedAdminApp)` — the exact mounts ticket 14's docstring
   reserved. `pressRouter`/`buildSpecOf`/the theme are **not** touched (SSG
   output stays byte-identical — the ticket-14 gate still holds). Serve is the
   only mode that carries these; `build`/SSG never emits an auth route.

8. **Graceful shutdown note (ticket-14 follow-up).** Confirm whether in-flight
   auth flows need a drain on `close`/SIGTERM beyond node defaults; if the
   serve loop needs a hook, record it (production operations is ticket 28) —
   do not build supervision here.

9. **Specs — the phase-6 gate, enumerated (colocated, flat `test()`, absolute
   imports):**
   - **RP client:** `beginLogin` produces a valid `S256` challenge and a fresh
     `state`/`nonce`; `completeLogin` full round trip over the in-process
     transport yields the expected `Subject`+claims; **state mismatch**,
     **missing code**, **token-exchange non-200**, and **tampered/expired
     id_token** each yield the right `RpError` variant (no throw).
   - **Guard middleware:** `requireRole` — `None`→401, wrong role→403, right
     role→`next` with principal in state; proves **no fail-open** path.
   - **CSRF:** matching token→`next`; missing/mismatched token→403; safe methods
     bypass.
   - **RP session store:** save/find/`take` (logout burns it; a second logout is
     a no-op); expired session rejected at read.
   - **Authorization-boundary matrix (the gate):** for **every** guarded route
     (`/admin`, `/admin/logout`, and any guest route) drive it three ways —
     **anonymous** (no cookie → 401/redirect-to-login), **guest** (valid guest
     session on an admin-only route → 403), **admin** (valid admin session →
     200) — via `handle(pressServeWeb(...), request)` so the real mounted
     middleware stack runs. A revoked-mid-session role (delete the membership,
     re-request) → 403 (proves instant revocation reaches the boundary).
   - **End-to-end dogfood:** anonymous `GET /admin` → login → `authenticate` →
     `completeAuthorization` → RP `callback` → RP session set → `GET /admin`
     now 200, all in-process.

10. **Docs & house rules.** `packages/plggpress/README.md` +
    `packages/guide/packages/plggpress.md`: a short "served instance = OP + RP"
    section (auth-code + PKCE, admin session, CSRF). End to end: no
    `as`/`any`/`ts-ignore`; Option not null, Result not throw, exhaustive
    `match` over `Role` and `RpError`; data-last pipelines; Prettier
    `printWidth: 50`; **zero new third-party deps** (only the two `file:` plgg-*
    deps); no native bindings; verify no runner-script edit is required.

## Quality Gate

**Acceptance criteria**

1. The served plggpress instance **mounts the OIDC OP** (`mountOidc`) under
   `/auth` and **acts as its own RP**: a full authorization-code + PKCE login
   completes **in-process** (RP transport = the served app's own `handle`),
   the returned ID token is validated through the OP's JWKS, and an RP
   application session is established.
2. A **reusable, Result-typed RP client** exists in plgg-auth (`src/Rp/`),
   transport-agnostic (in-process or socket), with a closed `RpError` union;
   `packages/plgg-auth/example.ts` is refactored onto it and the inline
   `must()`-based dance is gone (one implementation).
3. The RP **session cookie is scoped to the admin subtree** (`Path=/admin`) on
   the `sessionCookie` secure baseline (`HttpOnly; Secure; SameSite=Lax`),
   carries only an opaque id (never the `Subject`), and **logout** burns the
   server-side session (`take*`) and clears the cookie.
4. **CSRF protection** guards every state-changing POST (login, logout,
   invite-redeem): a double-submit token compared constant-time; a
   missing/mismatched token is 403 (spec-proven), safe methods bypass.
5. **`requireRole`/`requireScope` guard middleware** exists in plgg-server,
   is **auth-agnostic** (plgg-server gains **no** plgg-auth dependency;
   resolver injected), **never fails open** (missing session→401, wrong
   role→403, exhaustive `match`, no default-allow), and is consumed by
   plggpress via ticket 18's `roleOf`.
6. **Authorization-boundary tests pass for anonymous / guest / admin on every
   guarded route**, driven through the real mounted stack
   (`handle(pressServeWeb(...), req)`), including a **revoked-mid-session**
   role landing as 403 — the phase-6 gate — plus CSRF accept/reject coverage.
7. All mounts live **only** in `pressServer.ts`; `pressRouter`/`buildSpecOf`/
   the theme are untouched (ticket-14 SSG byte-identity still holds — `build`
   emits no auth route). `git diff --stat` adds plgg-auth `Rp/*`, plgg-server
   guard/CSRF middleware, plggpress `auth/*` + the two `file:` deps in
   `package.json`, and docs — **no third-party dependency**, **no runner-script
   edit**, no `bundle.config.ts`/`tsconfig.json` change.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plgg-auth.sh`,
`./scripts/test-plgg-server.sh`, and `./scripts/test-plggpress.sh` green; then
a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not mask
drift; also unmasks the export-surface concern 51 for the new plggpress deps)
green end to end, with plgg-auth, plgg-server, and plggpress all above the >90
threshold across statements/branches/functions/lines including every new
module. Run `npx tsx packages/plgg-auth/example.ts` and confirm the refactored
RP client prints the full round trip. Serve smoke: `cd packages/guide && npx
plggpress serve --port <p>`, then `curl -i http://localhost:<p>/admin`
(anonymous → 401/redirect-to-login), and paste the boundary-matrix spec result
+ `git diff --stat`.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND coverage stays >90 on all three packages. A fail-open guard branch, a
route mounted outside `pressServer.ts`, a plgg-server→plgg-auth dependency, a
CSRF-unprotected state-changing POST, a `Subject` stored in the cookie, an SSG
byte diff, a new third-party dependency, an escape hatch
(`as`/`any`/`ts-ignore`), a throw where a `Result` belongs, or a coverage dip
fails the ticket.

## Considerations

- **RP session ≠ OP SSO session — keep them separate.** The OP
  `plgg_auth_session` (`Path=/`) is the IdP's single-sign-on session; the RP
  session (`Path=/admin`) is the admin app's authorization session. Merging
  them would collapse the dogfooding into a bespoke session shim and defeat D6's
  purpose. Record the distinction in `pressAuth.ts`'s docstring; ticket 27's
  MCP-over-HTTP OAuth will thank you for the clean OP boundary.
- **In-process transport is a dogfooding optimization, not a coupling.** The RP
  client MUST work over a real socket (the transport seam guarantees it); the
  served instance merely injects `handle(op, …)` to avoid a loopback round trip.
  When D5's topology eventually splits the reader from the dynamic instance, or
  a separate RP appears, the same client is reused unchanged — that is the whole
  reason to extract it here rather than inline it in plggpress.
- **Layering — the guard stays generic.** Resist putting `roleOf` inside
  plgg-server; the resolver injection keeps plgg-server free of plgg-auth. If a
  reviewer proposes an auth-aware middleware in plgg-server, that is the failure
  mode — the generic middleware + plggpress-side resolver is the design.
- **No username-enumeration oracle** (carried from ticket 18): the login route
  returns the same outward failure for unknown-user and wrong-password; the
  invite-redeem route the same for unknown/expired invite. The RP client's
  errors are for the *RP developer*, never surfaced verbatim to an end user.
- **Export-surface concern (51):** adding plgg-auth/plgg-sql to plggpress's
  runtime deps widens the bundle surface plgg-bundle discovers by execution;
  keep both barrels import+default clean and confirm on a fresh `check-all.sh`
  (clean-runner). If the surface probe misbehaves, that is concern 51 surfacing,
  not this ticket's bug — record and route it there.
- **Rate-limiting, account lockout, MFA, and password reset are out of scope**
  (ticket 18 fenced them; rate-limiting is a route/operations concern for
  ticket 28). This ticket ships the correct auth boundary, not brute-force
  hardening.
- **Session sweeping** of expired `rp_sessions` is an operations concern
  (ticket 28); `findRpSession`/`takeRpSession` already reject expired sessions
  at read time, so correctness does not depend on a sweeper — record a
  follow-up, do not build a cron.
- **Graceful shutdown** of in-flight auth flows (ticket-14's reserved question):
  assess whether `serve` needs a drain hook; if node defaults suffice, say so;
  if not, route it to ticket 28 rather than half-implementing supervision here.
- **Revisit trigger:** when ticket 27 adds MCP-over-HTTP OAuth and API-token
  issuance, re-examine whether `requireScope` and the OP client-registration
  path need to graduate from plggpress wiring into a shared helper; until a
  second consumer exists, keep the wiring in `pressAuth.ts`.
