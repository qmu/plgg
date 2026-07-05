# Ticket 19 — plggpress OIDC OP+RP dogfooding: design note

Mandated design step (before any `src/` edit). Fixes the four decisions.

## (a) RP client shape (plgg-auth `src/Rp/`)

- `RpTransport = (req: HttpRequest) => Promise<Result<HttpResponse, RpError>>` —
  the sole I/O seam. Production wires it over the network; the testkit
  `inProcessTransport(op: Web): RpTransport` wires it over `handle(op, req)`
  (the example's in-process round trip becomes the living test).
- `RpConfig` — `clientId: ClientId`, `redirectUri: RedirectUri`,
  `issuer: Str`, endpoint paths (`authorizePath`/`tokenPath`/`jwksPath`, default
  the OIDC standards), `audience: Str`, `clock: () => number`,
  `leewaySeconds: number`.
- `RpError` — closed union: `state_mismatch | missing_code |
  token_exchange_failed | invalid_id_token | transport_error` (each a
  `defineVariant`), so a caller folds exhaustively.
- `beginLogin(config)()` → mint `CodeVerifier` (`asCodeVerifier` over a CSPRNG
  64-char) + `computeS256Challenge`, a CSPRNG `state` + `nonce`; return
  `{ authorizeUrl, verifier, state, nonce }`. The URL is assembled with
  `URLSearchParams` — never string concatenation of unescaped values.
- `completeLogin(config, transport)(callbackQuery, stashed)` →
  1. `callbackQuery.state === stashed.state` else `state_mismatch`;
  2. read `code` else `missing_code`;
  3. POST `grant_type=authorization_code&code&redirect_uri&client_id&code_verifier`
     (form-encoded via URLSearchParams) through `transport`; non-200/error body
     → `token_exchange_failed`;
  4. `asCompactJws(id_token)` then `validateJwt({jwks, issuer, audience, clock,
     leewaySeconds, nonce: some(stashed.nonce)})` → `invalid_id_token` else;
  5. return `{ subject, claims, tokens }`.
  Every step folds through `Result`/`proc` — **no throw, no `must()`**.
- Refactor `packages/plgg-auth/example.ts` onto `beginLogin`/`completeLogin` over
  the in-process transport (delete the inline `must()` dance).

## (b) RP session model (plggpress `src/auth/`)

- Opaque CSPRNG session id (`freshOpaque()` pattern) → server-side row
  `{ subject, expiresAt }` in `rp_sessions (id TEXT PK, subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL)`. The cookie carries ONLY the id, never the
  `Subject`.
- Cookie scoped to **`Path=/admin`**, on the `sessionCookie` secure baseline
  (HttpOnly, Secure, SameSite), name `plgg_rp_session` — **distinct** from the OP
  SSO cookie `plgg_auth_session`.
- **Why separate from the OP session**: the OP session authenticates the human to
  the IdP (who are you, SSO across clients); the RP session authorizes THIS admin
  app (are you allowed in /admin, this app's lifetime). Conflating them would
  couple admin logout to global SSO logout and leak IdP lifetime into the app.
- Store seam `saveRpSession`/`findRpSession`/`takeRpSession` (take = SELECT+DELETE
  in one transaction, for logout), mirroring `AuthStore`/`sqlStore`; + an
  in-memory testkit driver.

## (c) CSRF scheme (plgg-server `src/.../csrf.ts`, generic)

- Double-submit token: `issueCsrfToken()` mints a CSPRNG token;
  `csrfCookie(token)` builds a **non-HttpOnly**, `SameSite=Strict`, `Path`-scoped
  cookie; the same token is echoed in a hidden form field / `X-CSRF-Token`
  header.
- `requireCsrf: Middleware` on unsafe methods (POST/PUT/PATCH/DELETE) reads the
  cookie token and the submitted token and compares them **constant-time**
  (XOR-accumulate over equal-length bytes, as ticket 18's password verify) → 403
  on mismatch/absence, else `next`. No auth coupling — any state-changing form
  reuses it (login, logout, invite-redeem).

## (d) Guard placement (plgg-server `requireRole`/`requireScope`, generic)

- `requireRole<R>(resolve: (c) => Promise<Option<R>>, allowed: (r) => boolean):
  Middleware` — `matchOption` on the resolved role: `None` → 401, `Some(r)` with
  `!allowed(r)` → 403, else `setState` the principal and `next`. **No
  default-allow branch.**
- `requireScope<S>` — same shape over an OAuth scope set (ticket 16/27 token
  routes).
- Both **auth-agnostic**: plgg-server gains NO plgg-auth dependency; plggpress
  injects the resolver (`roleOf` over the RP session cookie). This is the
  layering invariant — the resolver crosses the boundary, not the type.

## Mounts

All at the ONE seam `packages/plggpress/src/server/pressServer.ts`
(`pressServeWeb`), via plgg-server `route(base, sub)` (scopes middleware to the
prefix): `route("/auth", mountOidc(providerConfig)(web()) + the app-owned
/auth/login route)` and `route("/admin", adminApp)` where adminApp carries
`requireCsrf` + `requireRole(rpRoleResolver, isAdmin)`. Reader routes (the SSG
content router) are never touched.
