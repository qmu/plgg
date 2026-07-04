---
created_at: 2026-07-04T14:30:27+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260704143019-plggpress-oidc-rp-integration.md, 20260704143026-plgg-mcp-stdio.md, 20260704143021-requests-and-comments-accumulation.md]
---

# plgg-mcp over Streamable HTTP, mounted on the served plggpress and protected as an OAuth 2.1 resource server against our own OP — bearer-scoped public read vs. account-holder write tools

## Overview

Phase 10 (MCP & plugin), ticket **27** of the plggpress/plggmatic roadmap —
the ticket that puts the hand-rolled MCP server on the wire and makes it
speak OAuth. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

This ticket implements the **second stage of D15** verbatim: *"MCP
implementation — Hand-rolled (JSON-RPC 2.0 on node stdlib) per
vendor-neutrality. stdio transport + read-only tools first; **streamable HTTP
+ OAuth (via our own OP, D6) second**."* Ticket 26 delivered the first stage
(the JSON-RPC 2.0 core, the tool registry, and the stdio transport with
read-only tools). This ticket delivers the second stage: a **Streamable HTTP
transport** for the same `plgg-mcp` server, **mounted on the served plggpress
instance** (D5's always-on dynamic mode), and **authorized as an OAuth
resource server** against the plggpress OP that ticket 19 stood up.

It also carries the authorization half of **D6**: *"Auth topology — plggpress
consumes plgg-auth as a real OIDC OP (self-hosted IdP, OP+RP dogfooding).
Chosen over a lighter session layer. **This makes MCP-over-HTTP authorization
and API-token issuance standard OAuth flows.**"* The point of running a real
OP (ticket 19) rather than a bespoke session shim is realized here: an MCP
client (Claude Code) discovers the OP from the protected resource, runs a
standard authorization-code + PKCE + dynamic-client-registration flow, and
presents a bearer token the resource server validates with **no bespoke
protocol** — exactly the standard OAuth path D6 promised.

**Scopes separate public read tools from account-holder write tools.** The
read-only tools ticket 26 shipped (search/read over the RAG/content index)
stay reachable with a `plggpress:read` scope; the state-changing tools this
phase introduces — `register_request` and `comment` (the collaborative
request/comment accumulation from Phase 7, tickets 21/22) — require a
`plggpress:write` scope that only an **account-holder** token carries. A read
token can never invoke a write tool; the boundary is enforced per-tool on
every `tools/call`, never fails open, and is proven by an
authorization-boundary matrix identical in spirit to ticket 19's phase-6 gate.

**The bearer-validation seam — a design decision this ticket must fix.** The
OP's access token today is an **opaque** bearer string
(`freshAccessToken()` = `box("AccessToken")(freshOpaque())`,
`packages/plgg-auth/src/Oidc/model/Tokens.ts`), NOT a JWT — while D6 and this
ticket's mandate call for *"bearer validation via plgg-auth JWKS."* Offline
JWKS validation requires a **signed** access token. So part of this ticket is
to give the OP a **JWT access-token profile (RFC 9068)**: `issueTokens`
(`packages/plgg-auth/src/Oidc/usecase/issueTokens.ts`) mints, alongside (or in
place of) the opaque token, a signed JWS access token carrying `iss`, `aud`
(the MCP resource indicator), `exp`, and a `scope` claim, signed with the same
`SigningKey` the ID token uses — so the resource server validates it with the
existing `validateJwt` (`packages/plgg-auth/src/Jose/usecase/validateJwt.ts`)
against the OP's published JWKS, with **no round-trip**. This keeps the
resource server stateless and vendor-neutral. (The alternative — RFC 7662
token introspection over the in-process transport — is recorded in
Considerations as the fallback if the design step prefers opaque tokens; the
task pins JWKS, so the JWT-access-token profile is the primary path.)

Hard scope fences (siblings own the rest — do NOT build here):
- The **MCP core, tool registry, and stdio transport** are ticket 26 —
  consumed, not reimplemented. This ticket adds a *second transport* to the
  same server and does not change stdio behavior.
- The **OIDC OP mount, the RP/admin login flow, the account domain, and the
  generic `requireScope`/`requireRole`/CSRF middleware** are ticket 19 —
  consumed. This ticket reuses ticket 19's `requireScope` for the bearer
  guard; it does not re-author authorization middleware in plgg-server.
- The **RAG/content search tools and the request/comment domain** themselves
  are tickets 16/21/22 — the write tools here are thin MCP adapters over
  those usecases, not new domain logic.
- The **Claude Code plugin export** (marketplace manifest + generated skills)
  is ticket 30 (D17). This ticket only exposes the MCP HTTP endpoint that
  export points a `.mcp.json` at.

Zero **new third-party** dependencies: plgg-mcp (ticket 26) and plgg-auth
(existing) are added to plggpress as `file:` deps; the HTTP transport is
`node:http`/Web `Request`/`Response` via plgg-server (already a plggpress
dep). No npm registry package enters any `package.json`; no native binding.

## Policies

- `workaholic:design` / `policies/security.md` — the policy snapshot reads
  *"No role-based or attribute-based access control exists … no server, no
  user database, and no permission model"* and *"No session management, token
  refresh, or multi-factor authentication mechanisms exist."* Ticket 18 moved
  the credential-store lines; ticket 19 moved the session-management and
  admin-authorization lines; **this ticket moves the API-authorization line** —
  it is the first place the monorepo enforces a *token-scoped* permission at a
  machine-to-machine HTTP boundary. Its discipline governs every choice: the
  bearer token is read only from the `Authorization: Bearer` header (never a
  URL query — the policy's own rule for API credentials), scope failures are
  typed `Result`s that resolve to `401`/`403` with a spec-compliant
  `WWW-Authenticate` challenge, and no secret (access token, session id)
  appears in a log. The phase-10 gate — *"MCP conformance exercised with a
  real client (Claude Code) against stdio and HTTP transports"* — is this
  ticket's Quality Gate.
- `workaholic:design` / `policies/security.md` (authorization sub-clause) —
  the per-tool scope guard must never *fail open*. A request with no bearer,
  an unverifiable JWT (bad signature / wrong issuer / wrong audience /
  expired), or a token lacking the tool's required scope resolves to
  `401`/`403` through an exhaustive `match` over the closed validation-outcome
  union; there is **no default-allow branch**, and a write tool is
  unreachable without `plggpress:write`. This is the enforcement mechanism the
  updated policy will cite for the delivery/MCP surface.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer; `as`/`any`/`ts-ignore` are prohibited.
  The scope set and the tool→required-scope mapping are a closed vocabulary
  consumed by exhaustive `match`, so adding a tool without declaring its scope
  (or forgetting a validation branch) is a `tsc` error, not a silent
  authorization gap — load-bearing for a security boundary. The JSON-RPC
  request/response and the resource-server error outcomes are closed
  discriminated unions. Prettier `printWidth: 50` governs every touched `.ts`.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package (fused `tsc --noEmit && plgg-test`, >90 across
  statements/branches/functions/lines). The authorization-boundary matrix
  (no-token / read-token / write-token × read-tool / write-tool) and the
  JWKS-validation failure cases (bad-sig, wrong-aud, expired, missing-scope)
  are enumerated as required specs, driven headlessly through the mounted
  transport via `handle(...)` so the whole round trip is covered without a
  socket.
- `workaholic:operation` / `policies/delivery.md` — the HTTP transport lands
  on the **served** instance only (D5 dual-mode); the SSG/`build` path emits no
  MCP route, so static output stays byte-identical (the ticket-14/16 gate still
  holds). New in-repo `file:` deps must not perturb build order — plgg-auth and
  plgg-mcp must build **before** plggpress in `scripts/build.sh` (exact
  `cd $REPO_ROOT/packages/<name> && npm run build` line format; publish order is
  sed-derived from it), and be present in `scripts/npm-install.sh` /
  `scripts/check-all.sh`. Verify, do not churn.

## Key Files

**The MCP server to give a second transport (from ticket 26 — consumed/extended):**

- `packages/plgg-mcp/src/` — ticket 26's package: the JSON-RPC 2.0 core
  (request/response/notification decode+encode on node stdlib), the tool
  registry (`Tool` = name + input schema + handler returning a `Result`), the
  `initialize`/`tools/list`/`tools/call` method dispatch, and the stdio
  transport. This ticket adds `Transport/http.ts` (Streamable HTTP) beside the
  stdio transport and a per-tool scope declaration; it does **not** change the
  core dispatch or stdio behavior.
- `packages/plgg-mcp/src/Tool/` (ticket 26) — the tool model; extend each
  registered tool with a **required-scope** field (`plggpress:read` |
  `plggpress:write`) so the guard reads it uniformly. The read tools ticket 26
  registered default to `plggpress:read`; the write tools this ticket adds
  declare `plggpress:write`.

**The OP being validated against (consumed; JWT-access-token profile added):**

- `packages/plgg-auth/src/Oidc/usecase/issueTokens.ts` — mints the token
  bundle; extend to also emit a **signed (JWS) access token** (RFC 9068)
  carrying `iss`, `aud`=resource indicator, `exp`, `scope`, signed with the
  active `SigningKey`. The opaque `AccessToken` stays for existing callers; the
  JWT is the bearer the resource server validates offline.
- `packages/plgg-auth/src/Oidc/model/Tokens.ts` — `AccessToken`
  (opaque, `freshOpaque()`); the new signed-access-token helper lives beside
  it (or in `Jose`), reusing `encodeJwt`/`signJws`.
- `packages/plgg-auth/src/Jose/usecase/validateJwt.ts` — `validateJwt(config)`
  (JWKS `kid`-resolved RS256 signature + issuer/audience/nonce/leeway claim
  rules); the resource-server bearer check calls this with `audience` = the MCP
  resource indicator and `nonce = none`.
- `packages/plgg-auth/src/Jose/model/JwtClaims.ts` — `JwtClaims` currently
  carries `iss`/`aud`/`exp`/`nbf`/`nonce` but **no `scope`**; add a `scope`
  claim (space-delimited RFC 6749 token list) to the decoded claims (or a
  sibling `AccessTokenClaims`) so the guard reads granted scopes from the
  verified JWT.
- `packages/plgg-auth/src/Oidc/model/AuthorizationRequest.ts` — `Scope`,
  `asScope`, `scopeString`, and the `openid`-required rule; the
  `plggpress:read`/`plggpress:write` scopes are `Scope` values threaded from
  `/authorize` → grant → issued token.
- `packages/plgg-auth/src/Jose/model/Jwks.ts` — `jwksJson`; the OP already
  publishes JWKS via `mountOidc`, so the resource server fetches (or is handed)
  the same JWKS.
- `packages/plgg-auth/src/Oidc/http/mountOidc.ts` — the OP mount ticket 19
  installs; unchanged here beyond the issue-token extension. Its discovery
  document is what the protected-resource metadata points a client toward.

**The authorization middleware to reuse (from ticket 19 — consumed):**

- `packages/plgg-server/src/Routing/usecase/requireScope.ts` (ticket 19) — the
  generic, **auth-agnostic** scope guard over an injected resolver; the MCP
  bearer guard supplies a resolver that extracts the `Authorization: Bearer`
  header, `validateJwt`s it against the OP JWKS, and yields the token's
  `Option<Set<Scope>>`. plgg-server stays free of plgg-auth (resolver injected).
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`
  (prefix-scoped middleware), `use`, `post`, `get`; the MCP app is a sub-`Web`
  mounted at `/mcp`, its bearer guard a sub-app `use` so it scopes to `/mcp/*`
  and nowhere else (reader/admin routes untouched).
- `packages/plgg-server/src/Http/model/Handler.ts` / `.../model/Context.ts` —
  `Handler`, `Middleware`, `Context`, `getState`/`setState`; the guard writes
  the verified subject + granted scopes into `Context` state so the per-tool
  check reads them.
- `packages/plgg-server/src/Routing/usecase/handle.ts` — `handle(app, request)`
  answers an `HttpRequest` with no socket; every spec drives the mounted MCP
  app through `handle` (the same in-process pattern ticket 19 uses for the RP).

**The mount seam (extend — the one composition point, from tickets 14/19):**

- `packages/plggpress/src/server/pressServer.ts` — `pressServeWeb(...)`; ticket
  14 reserved this as the *only* place later tickets compose mounts, and ticket
  19 mounted `/auth` and `/admin` here. This ticket adds `route("/mcp", mcpApp)`
  here and **nowhere else**. Serve-only; `build`/SSG never emits `/mcp`.
- `packages/plggpress/src/auth/pressAuth.ts` (ticket 19) — builds the
  `ProviderConfig` and shares the OP `Web` and JWKS; the MCP resource server
  reuses the same issuer/JWKS/`Db` (one served process, one OP).

**Files created (proposed — the design step may amend names):**

- `packages/plgg-mcp/src/Transport/http.ts` — the **Streamable HTTP** transport
  per the MCP spec: a single endpoint answering `POST /mcp` (client→server
  JSON-RPC messages, one response or an SSE stream) and `GET /mcp` (server→
  client SSE), threading an `Mcp-Session-Id` header for stateful sessions;
  built on plgg-server's Web `Request`/`Response` + plgg-http streaming.
- `packages/plgg-mcp/src/Transport/mcpWeb.ts` — assembles the transport + the
  registry into a mountable `Web` (`mcpWeb(server, guard)`), the bearer guard
  wrapping the dispatch so `tools/call` checks the tool's required scope
  against the token's granted scopes before invoking the handler.
- `packages/plgg-mcp/src/Auth/ResourceServer.ts` — the resource-server model:
  the resource indicator (audience) URI, the JWKS source, the `plggpress:read`/
  `plggpress:write` scope constants, and the closed
  `BearerOutcome = { subject, scopes } | missing | invalid | insufficient`.
- `packages/plgg-mcp/src/Auth/verifyBearer.ts` — `verifyBearer(config)(req)`:
  extract `Authorization: Bearer`, `validateJwt` against JWKS (aud = resource
  indicator), read `scope`, return `Result<{subject, scopes}, BearerOutcome>`;
  no throw.
- `packages/plgg-mcp/src/Auth/wwwAuthenticate.ts` — build the
  `WWW-Authenticate: Bearer resource_metadata="…"` challenge (RFC 9728) and the
  `insufficient_scope`/`invalid_token` error codes.
- `packages/plggpress/src/mcp/pressMcp.ts` — plggpress wiring: build the
  `ResourceServer` config from serve config (resource indicator = the served
  origin + `/mcp`, JWKS = the OP's, scope constants), register the read tools
  (ticket 26) and the write tools (`register_request`, `comment`) over the
  Phase-7 usecases, and expose the guarded `mcpWeb` for `pressServer.ts`.
- `packages/plggpress/src/mcp/tools/registerRequest.ts` +
  `.../tools/comment.ts` — the two write tools: thin `plggpress:write` MCP
  adapters over the request/comment usecases (tickets 21/22), input-validated
  through casters, subject taken from the verified token.
- `packages/plggpress/src/server/protectedResourceMetadata.ts` — serve
  `GET /.well-known/oauth-protected-resource` (RFC 9728) pointing at the OP's
  `authorization_servers`, so Claude Code discovers the OP → runs auth-code +
  PKCE + dynamic client registration (RFC 7591, served by the OP) → returns a
  scoped token. Mounted in `pressServer.ts`.
- Colocated `.spec.ts` beside every module above.

**Manifests / wiring (verify — no new third-party dep):**

- `packages/plggpress/package.json` — add `"plgg-mcp": "file:../plgg-mcp"`
  (and confirm `"plgg-auth": "file:../plgg-auth"` from ticket 19 is present).
  Externals are **derived from package.json** (`bundle.config.ts` says so), so
  **no `bundle.config.ts` edit**; `tsconfig.json` `paths` only self-alias
  `plggpress/*`, so **no `tsconfig` edit**.
- `packages/plgg-mcp/package.json` — add `"plgg-auth": "file:../plgg-auth"`
  (the resource-server bearer check needs `validateJwt`/JWKS) if ticket 26 did
  not already; keep plgg-server for the Web transport.
- `scripts/build.sh` — ticket 26 adds the `cd $REPO_ROOT/packages/plgg-mcp &&
  npm run build` line; **verify** it sits **after** plgg-auth and **before**
  plggpress (plggpress now `file:`-depends on plgg-mcp). plgg-auth already
  builds before plggpress. Adjust order only if the new dep edge requires it.
- `scripts/npm-install.sh`, `scripts/check-all.sh` — confirm plgg-mcp (from
  ticket 26) and plgg-auth are present; add `./scripts/test-plgg-mcp.sh` to
  `check-all.sh` if ticket 26 has not.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`,
  `.workaholic/policies/security.md` — the decision record and the policy this
  ticket updates the reality behind.

## Related History

This ticket is where the OP (ticket 19) and the MCP server (ticket 26)
converge into an authorized machine-to-machine surface:

- `.workaholic/tickets/todo/a-qmu-jp/20260704143026-plgg-mcp-stdio.md`
  (dependency) — the JSON-RPC 2.0 core, tool registry, and stdio transport
  with read-only tools; this ticket adds the HTTP transport and per-tool scope
  to that same server. Consume its registry and dispatch verbatim.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143019-plggpress-oidc-rp-integration.md`
  (dependency) — mounts the OIDC OP on the served plggpress (`mountOidc`,
  discovery, JWKS, `/authorize`, `/token`), delivers the auth-agnostic
  `requireScope` guard, and (per its own Considerations) flags the exact
  revisit this ticket triggers: *"when ticket 27 adds MCP-over-HTTP OAuth and
  API-token issuance, re-examine whether `requireScope` and the OP
  client-registration path need to graduate from plggpress wiring into a shared
  helper."* Honor its OP boundary; do not fork a second session model.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  — the `serve` verb and the `pressServer.ts` mount seam (D5 dual-mode); the
  `/mcp` mount lands there, serve-only, so SSG output stays byte-identical.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  — the content index / delivery API and the `requireScope` reuse the read
  tools sit on; the MCP read tools query the same index.
- `.workaholic/tickets/todo/a-qmu-jp/20260704143021-requests-and-comments-accumulation.md`
  — the request/comment accumulation domain the two `plggpress:write` MCP tools
  adapt; consume its usecases, do not reimplement.
- `.workaholic/tickets/archive/work-20260703-220007/20260703222254-plgg-auth-oidc-provider-core.md`
  and `…/20260703222253-plgg-http-cookies-and-form-decoding.md`
  (story `.workaholic/stories/work-20260703-220007.md`) — the OP core and the
  JOSE/JWKS machinery (`validateJwt`, `signJws`, `Jwks`) the resource-server
  bearer check and the JWT-access-token profile stand on.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — the precedent for
  plggpress taking direct `file:` plgg-* deps and externals derived from
  package.json; adding plgg-mcp follows that pattern exactly.
- Concern `.workaholic/concerns/51-carried-from-pr-47-export-surface.md` and
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md` — plgg-bundle
  discovers exports by executing the built bundle. plgg-mcp becomes a new
  *runtime* dep plggpress surface-requires; keep its barrel ESM-import-and-
  default clean (the roadmap's *"types+default entries for require() consumers"*
  note) so the surface probe doesn't regress. Verify on a fresh `check-all.sh`.
- Reference `.workaholic/` cloudflared-tunnel note — the served instance is
  reachable over the `qmu.dev` tunnel; when Claude Code connects to the HTTP
  MCP endpoint end-to-end (the gate), it does so through the served origin the
  resource indicator (`aud`) must match. Keep the audience = the public origin,
  not `localhost`.
- Downstream: ticket 30 (`claude-code-plugin-export`, D17) generates a
  `.mcp.json` pointing at this `/mcp` endpoint; keep the endpoint path and the
  discovery metadata stable so the exported plugin resolves it.

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Write a short design
   note (PR description or a `.workaholic/specs/` sketch) fixing: (a) the
   **bearer format** — confirm the JWT access-token profile (RFC 9068) over the
   opaque token, the claim set (`iss`/`aud`=resource indicator/`exp`/`scope`),
   and that `validateJwt` validates it offline against the OP JWKS (record the
   introspection fallback and why it was not chosen); (b) the **scope
   vocabulary** — `plggpress:read` vs `plggpress:write`, the tool→scope map,
   and that write tools are unreachable without `plggpress:write`; (c) the
   **Streamable HTTP shape** — the single `/mcp` endpoint, POST vs GET/SSE,
   `Mcp-Session-Id` handling, and how a session maps to a verified subject;
   (d) the **discovery chain** — protected-resource metadata (RFC 9728) →
   the OP's authorization-server metadata + dynamic client registration
   (RFC 7591) so Claude Code self-registers; (e) the **guard placement** —
   reuse ticket 19's `requireScope` in plgg-server with an injected
   JWT-verifying resolver, so plgg-server gains no plgg-auth dependency.
   Present at the drive approval gate; implement after agreement.

2. **JWT access-token profile in the OP (plgg-auth).** Extend
   `issueTokens` to mint a signed (JWS) access token beside the opaque one,
   carrying `iss`, `aud` (the resource indicator), `exp`, and a space-delimited
   `scope` claim built from the grant's `Scope[]`, signed with the active
   `SigningKey` via `signJws`/`encodeJwt`. Add the `scope` claim to
   `JwtClaims` (or a sibling `AccessTokenClaims`) and its caster. Do **not**
   remove the opaque token (existing callers keep it). Spec: the issued JWT
   validates through `validateJwt` with the OP JWKS and carries the requested
   scopes.

3. **Resource-server bearer check in plgg-mcp (`src/Auth/`).**
   - `ResourceServer.ts`: the resource indicator URI, the JWKS source, the
     scope constants, and the closed `BearerOutcome` union.
   - `verifyBearer.ts`: `verifyBearer(config)(req)` → read
     `Authorization: Bearer` (`missing` if absent), `validateJwt` with
     `audience` = resource indicator + `nonce = none` (`invalid` on any JOSE
     error), parse the `scope` claim into a `Set<Scope>`, return
     `Result<{ subject, scopes }, BearerOutcome>`. Every branch folds through
     `Result`/`match` — no throw.
   - `wwwAuthenticate.ts`: build `WWW-Authenticate: Bearer
     resource_metadata="<url>", error="invalid_token"|"insufficient_scope"` for
     the 401/403 responses.

4. **Per-tool scope on the registry (plgg-mcp).** Add a required-scope field to
   the `Tool` model; read tools default `plggpress:read`, write tools declare
   `plggpress:write`. In the `tools/call` path, resolve the called tool's
   required scope and check it against the request's granted scopes
   (from `Context` state, written by the guard); a `match` with **no
   default-allow** returns a JSON-RPC error mapped to HTTP 403 +
   `insufficient_scope` when the scope is absent. `tools/list` may filter to
   the scopes the caller holds (advertise only reachable tools).

5. **Streamable HTTP transport (`src/Transport/http.ts` + `mcpWeb.ts`).** Build
   the MCP Streamable HTTP endpoint on plgg-server's Web `Request`/`Response`:
   `POST /mcp` decodes a JSON-RPC message (via ticket 26's core), dispatches,
   and answers with a JSON response or an SSE stream; `GET /mcp` opens the
   server→client SSE channel; thread `Mcp-Session-Id`. `mcpWeb(server,
   bearerGuard)` assembles the registry + transport into a mountable `Web`
   whose `use(requireScope(resolveBearer, …))` runs the bearer check for
   `/mcp/*`. Reuse ticket 26's dispatch unchanged — this is a transport, not a
   new server.

6. **plggpress wiring (`src/mcp/pressMcp.ts` + tools).** Build the
   `ResourceServer` config from serve config (resource indicator = the public
   served origin + `/mcp`; JWKS = the OP's from `pressAuth.ts`; scope
   constants). Register ticket 26's read tools and the two write tools
   (`registerRequest.ts`, `comment.ts`) — thin `plggpress:write` adapters over
   the Phase-7 request/comment usecases, input-validated through casters, the
   author `Subject` taken from the verified token (never from the request
   body). Expose the guarded `mcpWeb`.

7. **Discovery + compose into the seam (`pressServer.ts`).** Add
   `GET /.well-known/oauth-protected-resource` (RFC 9728, pointing at the OP)
   and `route("/mcp", mcpApp)` in `pressServeWeb` — the same seam ticket 14/19
   own; `pressRouter`/`buildSpecOf`/the theme are **not** touched (SSG
   byte-identity still holds — `build` emits no `/mcp` and no
   protected-resource route). Serve is the only mode carrying these.

8. **Specs — the phase-10 gate, enumerated (colocated, flat `test()`,
   absolute imports):**
   - **JWT access token:** `issueTokens` emits a JWT that `validateJwt`
     accepts against the OP JWKS with the right `aud`/`scope`; a tampered
     signature, wrong audience, and expired token each fail validation.
   - **`verifyBearer`:** valid token → `{subject, scopes}`; missing header →
     `missing`; bad JWT → `invalid`; each yields the right `BearerOutcome`
     (no throw).
   - **Per-tool scope guard:** a `plggpress:read` token invoking a read tool →
     200; the same token invoking a write tool → 403 `insufficient_scope`; a
     `plggpress:write` token invoking a write tool → 200; **no fail-open** path.
   - **Authorization-boundary matrix (the gate):** for every tool, drive
     `tools/call` three ways — **no token** (401 + `WWW-Authenticate` pointing
     at the resource metadata), **read token**, **write token** — through the
     real mounted stack (`handle(pressServeWeb(...), request)`).
   - **Streamable HTTP:** `POST /mcp` `initialize` → `tools/list` →
     `tools/call` round trip over `handle`; `Mcp-Session-Id` echoed; an SSE
     `GET /mcp` opens.
   - **Discovery:** `GET /.well-known/oauth-protected-resource` returns the OP
     as an `authorization_servers` entry.
   - **SSG byte-identity:** `build` output unchanged (no `/mcp`, no metadata
     route emitted).

9. **Docs & house rules.** `packages/plgg-mcp/README.md` +
   `packages/guide/packages/plggpress.md`: a short "MCP over HTTP = OAuth
   resource server" section (discovery → auth-code + PKCE + DCR → scoped
   bearer → read vs write tools). End to end: no `as`/`any`/`ts-ignore`;
   Option not null, Result not throw, exhaustive `match` over `Scope`,
   `BearerOutcome`, and the JSON-RPC method union; data-last pipelines;
   Prettier `printWidth: 50`; **zero new third-party deps** (only `file:`
   plgg-* deps); no native bindings; verify build order and no unnecessary
   runner-script churn.

## Quality Gate

**Acceptance criteria**

1. The served plggpress instance mounts the **Streamable HTTP** MCP transport
   at `/mcp` (POST + GET/SSE, `Mcp-Session-Id`), reusing ticket 26's JSON-RPC
   core and tool registry unchanged; stdio behavior is untouched.
2. The endpoint is an **OAuth resource server against the plggpress OP**: it
   reads the `Authorization: Bearer` token, validates it **offline via
   `validateJwt` against the OP's JWKS** (RFC 9068 JWT access token; `aud` =
   the served-origin resource indicator), and reads granted scopes from the
   verified JWT — no bespoke protocol, no round-trip.
3. **Scopes separate public read from account-holder write**: read tools
   require `plggpress:read`, the new `register_request`/`comment` write tools
   require `plggpress:write`; a read token invoking a write tool is 403
   `insufficient_scope`; the guard **never fails open** (missing→401,
   insufficient→403, exhaustive `match`, no default-allow).
4. **Discovery works**: `GET /.well-known/oauth-protected-resource` (RFC 9728)
   advertises the OP, so a standards MCP client runs auth-code + PKCE + dynamic
   client registration against the OP and returns a scoped token; 401 responses
   carry a `WWW-Authenticate: Bearer resource_metadata=…` challenge.
5. The reused guard is ticket 19's `requireScope` with an **injected
   JWT-verifying resolver** — plgg-server gains **no** plgg-auth dependency;
   the resolver lives in plgg-mcp/plggpress.
6. **Authorization-boundary tests pass** for no-token / read-token / write-token
   across read and write tools, driven through the real mounted stack
   (`handle(pressServeWeb(...), req)`) — the phase-10 gate — plus the JWKS
   validation-failure cases (bad-sig, wrong-aud, expired, missing-scope).
7. **Claude Code connects over HTTP** with a token issued by the plggpress OP:
   from a running `plggpress serve`, Claude Code discovers the OP, obtains a
   scoped token, lists tools, and calls a read tool (read scope) and a write
   tool (write scope), a write tool rejected under a read-only token.
8. All mounts live **only** in `pressServer.ts`; `pressRouter`/`buildSpecOf`/
   the theme are untouched (SSG byte-identity holds — `build` emits no
   `/mcp`/metadata route). `git diff --stat` adds plgg-auth JWT-access-token +
   `scope` claim, plgg-mcp `Transport/http.ts`+`Auth/*`+per-tool scope,
   plggpress `mcp/*` + the `plgg-mcp` `file:` dep, and docs — **no third-party
   dependency**, no `bundle.config.ts`/`tsconfig.json` change, minimal
   runner-script edits (build order only).

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plgg-auth.sh`,
`./scripts/test-plgg-mcp.sh`, and `./scripts/test-plggpress.sh` green; then a
**fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not mask
drift; also unmasks the export-surface concern 51 for the new plggpress dep)
green end to end, with plgg-auth, plgg-mcp, and plggpress all above the >90
threshold across statements/branches/functions/lines including every new
module. Serve smoke: `cd packages/guide && npx plggpress serve --port <p>`,
then:
`curl -i http://localhost:<p>/.well-known/oauth-protected-resource` (returns
the OP); `curl -i -X POST http://localhost:<p>/mcp -H 'content-type:
application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
(anonymous → 401 + `WWW-Authenticate`); then with a scoped bearer minted by the
OP, repeat `tools/list` (200) and a `tools/call` on a write tool under a
read-only token (403 `insufficient_scope`). Finally connect **Claude Code** to
`http(s)://<served-origin>/mcp` and confirm the full OAuth handshake +
read/write tool calls. Paste the boundary-matrix spec result and
`git diff --stat`.

**Gate**

All eight acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND coverage stays >90 on all three packages AND Claude Code completes a
real HTTP MCP session with an OP-issued token. A fail-open scope branch, a
write tool reachable without `plggpress:write`, a bearer read from a URL query,
a route mounted outside `pressServer.ts`, a plgg-server→plgg-auth dependency,
an SSG byte diff, a new third-party dependency, an escape hatch
(`as`/`any`/`ts-ignore`), a throw where a `Result` belongs, or a coverage dip
fails the ticket.

## Considerations

- **JWT vs opaque access token — the central design fork.** The OP issues
  opaque access tokens today; the task pins JWKS validation, which needs a
  signed token. The primary path (RFC 9068 JWT access tokens validated offline
  by `validateJwt`) keeps the resource server stateless and vendor-neutral.
  The fallback (RFC 7662 introspection over the in-process transport, mirroring
  ticket 19's `handle(op, …)`) is viable if the design step prefers to keep
  tokens opaque, at the cost of a round-trip and a new OP endpoint. Fix this in
  the design step; do not ship both.
- **Audience = the public served origin, not localhost.** The resource
  indicator (`aud`) the client and the resource server agree on must be the
  public origin the served instance is reached at (through the `qmu.dev`
  tunnel), or Claude Code's token will fail `aud` validation. Make the resource
  indicator a serve-config value, not a hard-coded `localhost`.
- **Dynamic client registration is the OP's job, not this ticket's.** Claude
  Code self-registers via RFC 7591 against the OP; if the OP (ticket 19) does
  not yet expose a registration endpoint, that gap surfaces here — record it
  and route it to ticket 19/the OP rather than half-building registration in
  plgg-mcp. This ticket owns the *resource* side (protected-resource metadata +
  bearer validation), not the *authorization-server* side.
- **`requireScope` graduation (ticket 19's revisit trigger).** This is the
  second consumer of `requireScope` (ticket 16's `/api` is the first). If the
  bearer-resolver + resource-server config wants to be shared between the MCP
  endpoint and the delivery API, that is the moment to graduate a small shared
  helper — but only once the duplication is real; keep it in plggpress wiring
  until then.
- **Write tools are thin adapters — no domain logic here.** `register_request`
  and `comment` must delegate to the Phase-7 usecases (tickets 21/22) and take
  the author from the verified token, never the request body. If those usecases
  are not yet available when this ticket is driven, register the write tools
  behind a feature flag (advertised only when the domain is present) rather
  than inlining request/comment logic.
- **Streamable HTTP session lifecycle & graceful shutdown** (ticket-14/28
  follow-up): long-lived SSE streams mean `serve` shutdown must drain or close
  MCP sessions cleanly. Assess whether the serve loop needs a drain hook; if
  node defaults suffice, say so; otherwise route it to ticket 28 (production
  operations), not this ticket.
- **Token lifetime & revocation.** Offline JWT validation cannot see a
  server-side revocation instantly (unlike ticket 18's membership `DELETE`).
  Keep access-token `exp` short and rely on the OP for re-issuance; if instant
  revocation of an MCP token is later required, that is the introspection
  trade-off — record it, do not build a revocation list now.
- **Export-surface concern (51):** adding plgg-mcp to plggpress's runtime deps
  widens the bundle surface plgg-bundle discovers by execution; keep the
  plgg-mcp barrel import+default clean and confirm on a fresh `check-all.sh`
  (clean-runner). A surface-probe misbehavior is concern 51, not this ticket's
  bug — record and route it there.
- **Rate-limiting and abuse controls** on the public `/mcp` endpoint are an
  operations concern (ticket 28); this ticket ships the correct authorization
  boundary, not throttling.
