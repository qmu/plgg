# Auth & admin

How the served [plgg-cms](/packages/plgg-cms)
instance authenticates and administers. plgg-cms runs a
real OpenID Connect provider ([plgg-auth](/packages/plgg-auth))
and logs in against itself (OP+RP dogfooding, decision
D6), layers an account domain on top, and serves an
admin UI declared on the [plgg-ui](/packages/plgg-ui)
scheduler/declaration surface — with three DB-primary
content domains behind it.

## OIDC, dogfooded

plggpress mounts plgg-auth's provider and is its own
relying party: the authorization-code flow with
mandatory S256 PKCE, an app-owned login route, and a
scoped admin session. From the plgg-auth README, the
provider is mounted as a data-last `Web => Web`:

```typescript
import { mountOidc } from "plgg-auth";

// mounts /.well-known/openid-configuration, /jwks.json,
// /authorize (+PKCE), /token, /userinfo
const web = mountOidc(config)(baseWeb);
```

The OP owns the protocol only — when `/authorize` finds
no session it redirects to the app's login route; the
app authenticates and calls `completeAuthorization(...)`,
then `sessionRedirect(...)` sets the session cookie.
Running a real OP (rather than a bespoke session shim)
is what lets [MCP-over-HTTP](/packages/plggpress/agent-surfaces)
and API tokens be standard OAuth flows.

## The account domain

Above the OP sits an account domain: WebCrypto password
accounts (PBKDF2), revocable admin/guest membership
with instant role revocation, and single-use
copy-paste invites. The admin subtree is guarded by
role/scope middleware plus CSRF on every mutating form.

## The admin UI

The admin UI is **declared**, not hand-built: a
[plgg-ui](/packages/plgg-ui) declaration (collections,
actions, queries) served under the auth-guarded `/admin`
subtree and rendered
**server-side** (no client bundle) — SSR pages whose
mutations POST through an `/admin/act` endpoint behind
`requireCsrf`. It proves the same declaration renders
in the browser and on the server.

## Three DB-primary domains

Behind the admin UI are three durable, DB-primary
domains (reversible migrations; the store is the source
of truth, unlike the rebuildable content index):

- **Stakeholder** — a conversation store (requests,
  comments, threads) attached to content, with a guest
  submission surface, admin lifecycle views, and a
  visibility-gated feed into the
  [RAG index](/packages/plggpress/agent-surfaces).
- **Guest drafts & revisions** — browser Markdown
  co-editing over the git-primary corpus, with DB-side
  drafts/revisions, admin-mediated export back to git,
  and optimistic base-revision conflict detection.
- **Media assets** — authenticated binary upload into
  DB-only staging, content-addressed storage,
  admin-mediated export into the git-tracked assets
  tree, and path/type/size safety on every write.

## Why a real OP

Choosing a real OIDC provider over a lighter session
layer (D6) makes authorization uniform: the browser
session, the API token, and the
[MCP resource server](/packages/plggpress/agent-surfaces)
all validate the same standard OAuth artifacts — no
bespoke protocol at any surface. See
[plgg-auth](/packages/plgg-auth) for the JOSE layer,
refresh-token rotation, and signing-key rotation that
back it.
