---
created_at: 2026-07-03T22:22:53+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 1h
commit_hash: 1ea0110
category: Added
depends_on:
---

# Add cookie codec and x-www-form-urlencoded decoding to plgg-http

## Overview

Phase 2 of 4 of the plgg-auth OIDC-provider effort (independent of phase 1;
both are prerequisites of phase 3). The OIDC endpoints need two HTTP
capabilities the stack lacks, and both are general HTTP concerns that belong
in the neutral `plgg-http` model package — not in plgg-auth:

- **Cookies**: parse the request `cookie` header into a `Dict`, and build
  `Set-Cookie` header values from a typed cookie model
  (`HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age`, `Expires`),
  including a decision on how `HttpResponse` represents **multiple**
  `Set-Cookie` headers (its `headers` is a single-valued `Dict`, and
  `Set-Cookie` values cannot be comma-joined).
- **Form decoding**: a pure `application/x-www-form-urlencoded` body decoder
  (`SoftStr → Dict`). `toHttpRequest` already lands urlencoded bodies as text
  in `req.body`, so this is a pure step reusing plgg-router's `parseQuery`
  algorithm plus `+` → space translation — no seam change needed.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — new model
  and usecase files follow plgg-http's `Http/model|usecase` layout.
- `workaholic:implementation` / `policies/coding-standards.md` — no escape
  hatches; malformed input degrades via `Result`/graceful fallback, never
  throws.
- `workaholic:implementation` / `policies/type-driven-design.md` — typed
  cookie attributes model; invalid cookie names/values unrepresentable.
- `workaholic:design` / `policies/defense-in-depth.md` — prototype-safe map
  construction from untrusted client keys; secure-by-default cookie
  serialization defaults for the session cookie phase 3 sets.
- `workaholic:implementation` / `policies/test.md` — >90% coverage, specs
  driven through the real `toHttpRequest`/`toNativeResponse` seams.

## Key Files

- `packages/plgg-http/src/Http/model/HttpRequest.ts` - `getHeader`
  (case-insensitive) and the prototype-safe `lookup` pattern every new Dict
  built from client input must follow
- `packages/plgg-http/src/Http/model/HttpResponse.ts` - `headers: Dict` and
  response builders; where Set-Cookie emission must be modeled
- `packages/plgg-router/src/Routing/usecase/parseQuery.ts` - the exact
  split/percent-decode/degrade-on-malformed algorithm to adapt for form
  decoding (lines 33-52)
- `packages/plgg-server/src/Http/usecase/toHttpRequest.ts` - `isTextualBody`
  already treats urlencoded as text; no change expected, spec through it
- `packages/plgg-server/src/Http/usecase/toNativeResponse.ts` - must emit
  multiple `Set-Cookie` headers correctly (Headers.append)

## Related History

plgg-http was deliberately extracted as the neutral shared HTTP model; its
extraction ticket encodes the doctrine that peer packages must not depend on
each other's implementation — which is why these two capabilities land here.

Past tickets that touched similar areas:

- [20260530103253-extract-shared-http-model-into-plgg-http.md](.workaholic/tickets/archive/work-20260528-143038/20260530103253-extract-shared-http-model-into-plgg-http.md) - defines the neutral plgg-http package this ticket extends
- [20260527023825-http-failure-vocabulary.md](.workaholic/tickets/archive/work-20260513-182057/20260527023825-http-failure-vocabulary.md) - prior HttpError extension for auth statuses (401/403), same extend-the-model motion

## Implementation Steps

1. `Http/model/Cookie.ts`: cookie name/value validation (RFC 6265 token /
   cookie-octet grammar) via `refinedBrand`; `SetCookie` record with typed
   attributes (`path`, `domain`, `maxAge`, `expires`, `httpOnly`, `secure`,
   `sameSite: "Strict" | "Lax" | "None"`), all optional fields as `Option`.
2. `Http/usecase/parseCookies.ts`: `SoftStr → Dict<string, SoftStr>` over the
   `cookie` header value (`;`-separated pairs), prototype-safe accumulation,
   malformed pairs skipped; plus a `getCookie(name)` Option accessor over
   `HttpRequest`.
3. `Http/usecase/serializeCookie.ts`: `SetCookie → SoftStr` header value;
   reject/omit invalid attribute combinations at the type level where possible
   (e.g. `SameSite=None` requires `Secure`).
4. Decide and implement multi-`Set-Cookie` representation on `HttpResponse` —
   recommended: a dedicated `cookies: ReadonlyArray<SetCookie>` field
   (defaulted empty by all existing builders, so this is additive) that
   `toNativeResponse` emits via `Headers.append`, keeping `headers` a
   single-valued `Dict`. Update `toNativeResponse` accordingly.
5. `Http/usecase/parseForm.ts`: pure urlencoded decoder — adapt `parseQuery`'s
   algorithm (`&` split, first-`=` split, percent-decode with degrade), adding
   `+` → space before decoding; prototype-safe; last duplicate wins
   (consistent with `parseQuery`).
6. Barrel exports; specs colocated; format with Prettier.

## Quality Gate

Defaults adopted per ticket interrogation (developer AFK; recommended options
recorded).

**Acceptance criteria** — the checkable conditions that must hold:

- `parseCookies` handles: multiple pairs, whitespace around `;`, valueless and
  malformed pairs (skipped, no throw), duplicate names (last wins), and a
  `__proto__` cookie name without polluting the result (prototype-safe).
- `parseForm` decodes `a=1&b=hello+world&c=%E3%81%82`, treats `+` as space,
  degrades malformed percent-sequences to the raw token (parseQuery parity),
  and is prototype-safe.
- `serializeCookie` output matches RFC 6265 shape for each attribute;
  `SameSite=None` without `Secure` is unrepresentable or rejected as `Err`.
- A response carrying two cookies produces two distinct `Set-Cookie` headers
  through `toNativeResponse` (asserted via `Headers.getSetCookie()`).
- An end-to-end spec: a native `Request` with an urlencoded body passes
  through `toHttpRequest`, and `parseForm(req.body)` yields the expected Dict.
- No `as`/`any`/`ts-ignore` introduced anywhere in the diff.

**Verification method** — the commands/tests/probes that prove them:

- `cd packages/plgg-http && npm run coverage` green (threshold per package
  config) with the new specs; `cd packages/plgg-server && npm run test` green
  (toNativeResponse change).
- `scripts/tsc-plgg.sh` green.

**Gate** — what must pass before approval:

- Both packages' test/coverage runs green, `scripts/check-all.sh` green on a
  fresh rebuild (stale-dist drift rule), and the multi-Set-Cookie e2e
  assertion passing.

## Considerations

- `HttpResponse.headers` being a single-valued `Dict` is the one real design
  decision here; comma-joining `Set-Cookie` is not spec-valid, so the additive
  `cookies` field is preferred over changing the `Dict` value type and
  rippling through every consumer (`packages/plgg-http/src/Http/model/HttpResponse.ts`).
- `toNativeResponse` changes touch plgg-server, so run its suite too; a fresh
  `check-all.sh` is required because stale dists mask cross-package type drift
  (`scripts/check-all.sh`).
- Keep plgg-http free of any plgg-router dependency: copy/adapt the parseQuery
  algorithm rather than importing it (peer packages must not depend on each
  other's implementation) (`packages/plgg-router/src/Routing/usecase/parseQuery.ts`).
- Secure-by-default matters for phase 3's session cookie: document
  `httpOnly: true`, `secure: true`, `sameSite: "Lax"` as the recommended
  baseline in the builder's doc comment
  (`packages/plgg-http/src/Http/model/Cookie.ts`).
- Phase 3 (`20260703222254-plgg-auth-oidc-provider-core.md`) consumes both
  capabilities (token endpoint form body; session cookie).

## Final Report

Development completed as planned. Approval gate auto-resolved: the developer
was away at the per-ticket prompt, and the `/drive` batch was explicitly
authorized in-session ("do it but through phases") with every pre-agreed
Quality Gate criterion verified green.

### Discovered Insights

- **Insight**: Multi-`Set-Cookie` was implemented as an additive `"\n"`-fold inside the existing `headers` Dict entry (split + `Headers.append` at `toNativeResponse`), not as the ticket's recommended dedicated `cookies` field on `HttpResponse`.
  **Context**: A new required field would ripple through every response constructor and plgg-fetch's response seam; the fold is safe because the cookie brands exclude control characters, so `"\n"` cannot occur in a serialized cookie — the invariant lives in exactly two documented places (`withSetCookie`, `toHeaders`).
- **Insight**: The computed-key spread accumulation (`{...acc, [key]: value}`) already used by plgg-router's `parseQuery` is prototype-safe by spec — only the literal `__proto__: v` property form sets a prototype; a computed key creates an own property.
  **Context**: parseCookies/parseForm reuse the pattern and the specs pin it with a `__proto__` pollution probe, so future refactors to `Object.assign`-style accumulation (which is NOT safe for `__proto__`) would fail loudly.
