---
created_at: 2026-07-04T14:30:20+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on: [20260704143012-action-form-components.md, 20260704143016-plggpress-content-index-and-delivery-api.md, 20260704143019-plggpress-oidc-rp-integration.md, 20260704143010-multi-column-renderer.md, 20260704143011-single-column-renderer.md]
---

# plggpress admin UI declared on the scheduler: content browsing, account/invite management, and site settings — served under the auth-guarded `/admin` subtree, proven in both display modes

## Overview

Phase 6 (Auth & admin), ticket **20** of the plggpress/plggmatic roadmap —
the phase's capstone and the **first real consumer of the declarative
scheduler**. This is where the framework half of **D1** stops being a demo
and earns its keep on a production surface, and where **D3**'s sequencing
(theme first, then scheduler) cashes out into an actual application screen.
Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

The governing decisions, transcribed so an implementer need not open the
spec:

- **D1** — *"Home of the declarative UI scheduler: **plggmatic** (= design
  system + UI scheduling framework); plggpress is its CMS consumer."* This
  ticket is plggpress consuming plggmatic exactly as D1 intends: the admin UI
  is **declared** as Resources / Menus / List+Detail views / Actions, and the
  running program (Model, Msg, `update`, URL codec) is **scheduled** from that
  declaration — plggpress writes *what* the admin does, not a hand-rolled TEA
  loop. Ticket 09's demo scheduled a toy dataset with a "deliberately crude
  demo-only renderer"; this ticket schedules a real one behind auth, so it is
  the proof that the vocabulary survives contact with persistence-backed
  resources (ticket 09's Considerations name *"ticket 20 admin-ui-on-scheduler"*
  as exactly that revisit trigger).
- **D10** — *"Screen modes: **Runtime-switchable**: the declaration format is
  mode-agnostic from day one; the single-column renderer may ship later, but
  the vocabulary never encodes a mode."* The admin is rendered through **both**
  ticket 10's multi-column renderer and ticket 11's single-column renderer from
  the **same** scheduled declaration, with a runtime switch — this is the
  **mode-parity proof**: one declaration, two renderers, identical behavior.
- **D6** — *"plggpress consumes plgg-auth as a real OIDC OP (self-hosted IdP,
  OP+RP dogfooding)."* The `/admin` subtree is authenticated by the RP wiring
  ticket 19 lands over the OP; this ticket adds the **authorization** layer on
  top (role gating), not the authentication plumbing.
- **D7** — *"roles as an app-side membership table keyed by Subject (instantly
  revocable); invites as copy-paste links generated in the admin UI — no
  SMTP."* Ticket 18 built the account/role/invite domain and stopped at pure
  store seams (its `createInvite` *"returns the plaintext token ONCE … the link
  is a client concern for ticket 20"*). This ticket is that client: the admin
  screen mints invites and renders the shown-once copy-paste link, lists
  members with their roles, and grants/revokes — every mutation an Action verb
  with confirmation-as-data for the destructive ones.
- **D12** — *"plgg-kit is the single active vendor seam … embeddings are opt-in,
  activated by configuring an LLM API key."* Site settings include the operator
  **LLM API key** that turns on the opt-in RAG/agent tiers (phases 8/9). This
  ticket decides and records the **secrets storage posture** for that key
  (below and Implementation Step 1), delegating the at-rest-encryption and
  rotation lifecycle to ticket **28** (production topology & operations).
- **D14** — *"New packages gated ≥90 from day one."* No new package here (the
  admin lives inside plggpress, already gated), but every new admin module
  ships spec'd above the four-metric 90 from its first commit.

The roadmap's **Phase 6 gate** is the hard bar this ticket must clear:
*"authorization-boundary tests (anonymous/guest/admin) on every admin/API
route; CSRF coverage."*

**Secrets storage posture (decided here, recorded for ticket 28).** The
operator LLM API key is a bearer secret, not content. It therefore lives
**neither in the git-primary corpus (D4) nor in the derived, rebuildable
SQLite content index (D4/ticket 16)** — a disposable, reconstructable index is
the wrong home for a secret. It is held in a dedicated **server-side settings
store** (a small `settings` table or a gitignored config file loaded at boot),
the value is **write-only from the UI** (the admin form sets it; the API and
UI thereafter report only presence/validity — masked "configured" / "not
configured", never the plaintext back to the client), it is **never logged and
never placed in a URL** (extending `plgg-kit`'s header-not-URL discipline and
security.md's secrets rules), and it is transmitted over HTTPS only. The admin
surface **validates** a submitted key through the `plgg-kit` seam (a cheap
authenticated probe) and stores it only on success. **At-rest encryption, a
key-rotation drill, and the state-directory/backup story are explicitly ticket
28's** — this ticket keeps the settings store path-parameterized and the key
field write-only so ticket 28 can wrap encryption at the seam without
reshaping the UI.

Scope walls (siblings own the rest): the scheduler vocabulary + `schedule()`
are **ticket 09's** (consumed, not extended — if the admin needs a vocabulary
concept 09 lacks, extend 09, do not fork a parallel model); the two renderers
are **tickets 10/11** (consumed, not modified); the form/action/confirm/toast
components are **ticket 12's** (consumed); the content query functions
(`listCollection`/`getDocument`/`searchIndex`/`listCollections`) are **ticket
16's** `plgg-content` (called in-process — D17's "callable as plain typed
functions" path, no HTTP hop); the account/role/invite domain
(`authenticate`/`roleOf`/`grantRole`/`revokeRole`/`createInvite`/`redeemInvite`)
is **ticket 18's**; the login route, session cookie, RP/OP mount, and CSRF
token machinery are **ticket 19's** — this ticket **consumes the session and
guards on it**, it does not re-issue cookies. Requests/comments accumulation
is **ticket 21**, guest article editing is **ticket 22**, media/asset upload
is **ticket 23** (so no file-input control here — ticket 12 left it deferred),
RAG embeddings + the voice agent are **phases 8/9**, and MCP/plugin-export
settings surfaces are **tickets 26/27/30**.

## Policies

- `workaholic:design` / `policies/security.md` — the policy snapshot records
  *"No role-based or attribute-based access control exists … no server, no user
  database, and no permission model"* and, on secrets, that keys *"are passed
  in HTTP headers … and not in URL query parameters"* and *"No secrets are
  embedded in source code."* This ticket stands up the project's **first
  authorization boundary** (an admin-gated route subtree) and its **first
  operator-secret input surface** (the LLM API key). It must honor the
  documented discipline: the key never reaches a URL, a log, or the client
  after being set; authorization is a closed `Role` decision (`admin | guest`
  from ticket 18's `roleOf`) consumed with exhaustive `match`, evaluated at the
  route seam for *every* admin route; anonymous → login redirect, authenticated
  non-member/guest → 403 on admin-only surfaces. CSRF protection (ticket 19's
  token) is asserted on every state-changing Action. These are the phase-6
  gate's authorization-boundary and CSRF requirements made concrete.
- `workaholic:design` / `policies/accessibility.md` — the snapshot marks
  accessibility *"not applicable (no UI components)"*; that predates plggmatic
  and this is the highest-stakes UI it has yet grown. This ticket is the
  **revisit trigger ticket 12 named for real focus management**: ticket 12
  shipped the confirm dialog with correct `role="dialog"`/`aria-modal`
  semantics but *"no focus trap / focus return … revisit trigger: ticket 20's
  admin UI, where keyboard-only operation gets tested for real."* The admin
  must be operable keyboard-only end to end (invite mint, role revoke behind
  the confirm dialog, settings save), and — because it renders under **both**
  mode renderers — it exercises landmark/label parity across the multi-column
  (ticket 10) and single-column (ticket 11) presentations.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict mode
  is the sole static-analysis layer and `as`/`any`/`ts-ignore` are prohibited.
  The admin is declared against ticket 09's closed vocabulary and ticket 18's
  closed `Role` union, so an unhandled resource kind, action verb, role, or
  settings field is a `tsc` error, not a runtime surprise — the authorization
  decision and the settings caster are provably total. Prettier `printWidth:
  50` governs every touched `.ts`.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package: `packages/plggpress` and `packages/plggmatic` carry the >90
  four-metric threshold (ticket 02 makes a missing config an explicit failure,
  not a silent skip). Every admin declaration module, the guard, the settings
  store, and the settings casters land fully spec'd; the authorization-boundary
  matrix (anonymous/guest/admin × every admin route) and the CSRF-rejection
  path are enumerated as **required** specs, not left to line-count luck, since
  they are security-critical branches.

## Key Files

- `packages/plggpress/src/Admin/` — **new** feature dir (house
  `model/`/`usecase/` layout) holding the admin **declaration** (Resources,
  Menus, List/Detail views, Actions, Flow) and its two-mode mount. This is
  where D1's "plggpress is plggmatic's CMS consumer" becomes source.
- `packages/plggpress/src/Admin/usecase/adminDeclaration.ts` (proposed) — the
  root declaration wiring content/account/settings Resources + Actions into
  one Flow; `adminGuard.ts` — the `roleOf`-based authorization at the route
  seam; `settingsStore.ts` + `SettingsField` model — the write-only settings
  store (LLM key posture above).
- `packages/plggmatic/src/index.ts` — the framework barrel exporting `schedule`
  and the vocabulary (ticket 09), the multi-column (ticket 10) and
  single-column (ticket 11) renderers, and the form/action/confirm/toast
  components (ticket 12). This ticket imports the **landed** shapes; it neither
  edits plggmatic nor re-declares its types.
- `packages/plgg-view/src/Program/usecase/application.ts` — `Application<Model,
  Msg>` (`init`/`update`/`view`/`onUrlChange`/`toUrl?`): the scheduled admin
  program plugs into this, with the renderer supplying `view`. Consumed.
- `packages/plgg-content/src/Query/usecase/` — ticket 16's `listCollection`,
  `getDocument`, `searchIndex`, `listCollections` (each `Db`-taking,
  HTTP-free): the async Resource read seam for content browsing, called
  in-process (D17). Delivered by ticket 16; consumed, not modified.
- `packages/plgg-auth/src/Account/` — ticket 18's account domain: `roleOf`,
  `grantRole`, `revokeRole`, `createInvite` (returns the plaintext invite token
  once), the `Role = "admin" | "guest"` union, and the `AccountStore` seam.
  Delivered by ticket 18; consumed for the account/invite Resources+Actions.
- `packages/plggpress/src/server/pressServer.ts` — the `pressServeWeb` mount
  seam ticket 14 establishes and ticket 16 first mounts `/api` on; ticket 19
  mounts the OP/RP/login routes on it. This ticket adds
  `route("/admin", adminGuard(deliverAdmin(...)))` here **and only here** (the
  seam's stated purpose). Delivered by ticket 14, extended by 16/19; this
  ticket adds one guarded mount.
- `packages/plgg-server/src/Routing/model/Web.ts` — `route(basePath, sub)`,
  `get`, the `Web` combinators the guarded admin sub-app is built from.
  Consumed.
- `packages/plgg-http/src/Http/` — `jsonResponse`, the cookie/session reader,
  and the CSRF-token surface ticket 19 wires; the guard reads the session here.
  Consumed.
- `packages/plgg-kit/src/LLMs/usecase/generateObject.ts` — the D12 vendor seam
  (`packages/plgg-kit/src/LLMs/usecase/generateObject.ts` lines 36–52 read the
  key from an explicit field or `env`): the settings surface validates a
  submitted LLM key through this seam and reports presence, never echoing it.
  Consumed.
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` — the existing config
  shape; the non-secret admin settings (and ticket 17's `models`) are read from
  here, the operator secret is **not** stored here (git-primary, would be
  committed) — it goes to the runtime settings store.
- `packages/plggpress/src/index.ts`, `packages/plggpress/package.json` — the
  barrel and manifest; the manifest's `exports` map must keep its
  `types`+`default` widening (concern **51**:
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`) and, per
  the wiring note below, plggpress's dependency on `plggmatic` /
  `plgg-content` / `plgg-auth` must already be present (established by tickets
  07/16/19).
- `scripts/build.sh`, `scripts/check-all.sh`, `scripts/npm-install.sh` — the
  runner scripts; the **build-order** invariant (plggmatic before plggpress)
  this ticket depends on (wiring note below). No new package ⇒ no new
  `cd`-line, but the order must be correct.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record; `.workaholic/policies/security.md` — the policy whose "no permission
  model" line this ticket moves.

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143012-action-form-components.md`
  supplies the caster-parsed forms, the `Cmd`-mapped submit pipeline, the
  confirm dialog, and the semantic toasts — the admin's every mutation is one
  of these. Its Considerations explicitly defer full dialog focus-trap/return
  management to *"ticket 20's admin UI, where keyboard-only operation gets
  tested for real"* — that limitation is **retired here** (or its blocking
  research, `20260613183139-research-ref-post-paint-hook`, is resolved and the
  resolution recorded).
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  delivers `plgg-content`'s HTTP-free query functions and states them as the
  in-process path for *"the admin UI (ticket 20)"* — this ticket is that
  in-process caller (no HTTP hop for the content Resources). It also notes
  richer filtering (`filters=`/`fields=`) is deferred *"until … the admin UI
  needs it — note it in ticket 20/29 if the admin UI needs it"* (see
  Considerations).
  `.workaholic/tickets/todo/a-qmu-jp/20260704143019-plggpress-oidc-rp-integration.md`
  mounts the OP+RP and the login route (`authenticate` →
  `completeAuthorization`), issues the session cookie, and provides the CSRF
  token — this ticket **guards on** that session and authorizes with ticket
  18's `roleOf`; it does not re-implement authentication.
- **Transitive foundation:**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143009-declarative-ui-vocabulary-and-scheduler-core.md`
  (the scheduler; its demo used a crude renderer and named this ticket as the
  persistence-backed revisit trigger),
  `…143010-multi-column-renderer.md` / `…143011-single-column-renderer.md` (the
  two renderers this ticket drives from one declaration for the mode-parity
  proof), and
  `…143018-account-domain-roles-and-invites.md` (the account/role/invite seams,
  whose `createInvite` explicitly leaves the copy-paste-link UI to ticket 20).
- `.workaholic/tickets/archive/work-20260703-220007/20260703222254-plgg-auth-oidc-provider-core.md`
  and `…20260703222255-plgg-auth-persistence-and-hardening.md` (story
  `.workaholic/stories/work-20260703-220007.md`) — the OP core and atomic
  `take*` persistence discipline the account/invite domain rides; invite
  redemption's single-transaction guard is the reason a minted link can't be
  double-redeemed under a race.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — established
  plggpress's `framework/` seam and direct-deps layout; the `Admin/` feature
  lands beside it. Note **D13** later reversed the exile (plggmatic is again
  the canonical framework in this monorepo) — plggpress consumes it, not an
  absorbed copy.
- `.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md`
  — the SSG/reader path; the admin is the **dynamic** side of D5's dual-mode
  topology (served instance), leaving the static reader byte-untouched.
- **Concern 51** (`.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`)
  — plggpress's export-map widening to keep `require()` consumers working;
  preserve it. **Sibling ticket 02** (`…143002-harden-coverage-gate-defaults.md`)
  makes the ≥90 gate load-bearing — assume enforcement.

**Wiring note (load-bearing):** the admin UI lives **inside plggpress** — no
new package, so no new `cd`-line enters `build.sh`/`npm-install.sh` and no new
`test-*.sh` enters `check-all.sh`. But plggpress now **consumes plggmatic** (the
scheduler + both renderers + the form components), so plggmatic's `dist` must
exist before plggpress builds. Today `scripts/build.sh` builds `plggpress`
(line 47) **before** `plggmatic` (line 67) — that order must be **inverted**
(plggmatic → plggpress). This inversion is almost certainly already made by
ticket **07** (`plggpress-theme-on-plggmatic`, phase 3, the first plggpress→
plggmatic dependency) and by ticket **16** (which moves `plgg-sql`/
`plgg-db-migration`/`plgg-content` ahead of plggpress) and ticket **19**
(`plgg-auth`); this ticket's job is to **verify** the order holds and, if any
predecessor left it wrong, correct it with the exact `cd $REPO_ROOT/packages/
<name> && npm run build` line format (publish order is sed-derived from it). A
fresh `check-all.sh` (clean rebuild, no stale dists) is the arbiter.

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Pin the **landed**
   contracts of every dependency (do not code against this ticket's prose where
   it disagrees with a shipped shape): ticket 09's `schedule()` signature +
   vocabulary types + renderer seam; tickets 10/11's renderer function
   signatures and the runtime mode switch; ticket 12's form/action/confirm/
   toast APIs and its action-lifecycle Msgs; ticket 16's query function
   signatures; ticket 18's `roleOf`/`grantRole`/`revokeRole`/`createInvite`
   and `Role`; ticket 19's session reader + CSRF token surface. Then record, in
   the PR description or a short `.workaholic/specs/` sketch: (a) the admin
   **declaration** outline (which Collections, Menus, views, and Action verbs);
   (b) the **authorization model** — which surfaces are admin-only vs
   guest-visible, evaluated where (the route-seam guard); (c) the **secrets
   storage posture** for the LLM key exactly as fixed in the Overview
   (write-only, out of the corpus and the derived index, validated through
   plgg-kit, encryption/rotation → ticket 28); (d) confirmation that the admin
   is one declaration rendered by **both** modes. Present at the drive approval
   gate; implement only after agreement.
2. **Content-browsing Resources** (`Admin/`): declare Collections over ticket
   16's query functions using ticket 09's **async Resource read seam** —
   `listCollections`/`listCollection` back the list views (with paging +
   `searchIndex` for the search box), `getDocument` backs the detail view. The
   read is a `Cmd`-shaped deferred source (`proc`/Promise folded to `Result`),
   so the declaration is storage-agnostic per D1. Content is read-only in this
   ticket (editing is ticket 22).
3. **Account/invite Resources + Actions** (`Admin/`): a members Collection over
   ticket 18's store (subject, username, role from `roleOf`); Actions —
   `grantRole` and `revokeRole` (destructive → **confirmation-as-data**, the
   `danger` role on confirm, ticket 12's `confirmDialog`), and `createInvite`
   whose completion renders the **shown-once copy-paste invite link** (ticket
   18 mints the token once and hands the plaintext to this UI; render it in a
   toast/panel with a copy affordance, never persist or re-fetch it). Invite
   role carried from the store (guest today), not hardcoded in the view.
4. **Site-settings surface** (`Admin/`, `settingsStore.ts` +
   `SettingsField`): a settings form (ticket 12's caster-parsed forms) over
   non-secret settings plus the **operator LLM API key** field. The key field
   is **write-only**: submit → validate through the `plgg-kit` seam
   (`generateObject`'s key resolution) → on success store in the runtime
   settings store (NOT `SiteConfig`, NOT the content index) → thereafter the
   API/UI report only `configured | absent`, masked, never the plaintext. No
   secret in a URL, a log, or a client response. Encryption/rotation deferred
   to ticket 28 (keep the store path-parameterized so 28 wraps it).
5. **Schedule the admin.** Compose steps 2–4 into one root declaration and
   `schedule()` it (ticket 09) into `Model`/`Msg`/`update`/URL codec — the full
   `Application` minus `view`. The scheduled model carries mode-independent
   truth only (D10 tenet (g)); no column/pane/screen concept enters the admin
   declaration.
6. **Render in BOTH modes** (the D10 mode-parity proof): supply `view` from
   ticket 10's multi-column renderer **and** ticket 11's single-column renderer
   over the *same* scheduled state, with the runtime mode switch. A spec drives
   the identical scheduled Model through both renderers and asserts behavioral
   parity (same landmarks, same navigation semantics, same Action wiring).
7. **Authorization guard + mount** (`Admin/usecase/adminGuard.ts`,
   `packages/plggpress/src/server/pressServer.ts`): a `Web` middleware that
   reads ticket 19's session, resolves `roleOf(subject)`, and gates —
   anonymous → login redirect; authenticated non-member or guest on an
   admin-only surface → 403; `admin` → through. Every state-changing Action
   verifies ticket 19's CSRF token. Mount `route("/admin",
   adminGuard(deliverAdmin(...)))` at `pressServeWeb` **and only there**
   (ticket 14's seam). The SSG reader path (`build`/`pressRouter`) stays
   byte-untouched (D5 dual-mode: static output unchanged).
8. **Runnable demo / real-browser drive** (proof-of-value, working-style):
   from the served instance — log in (ticket 19), browse a content collection
   (list → search → detail), mint an invite and copy the shown-once link,
   revoke a member's role behind the confirm dialog (cancel = no-op, confirm
   executes and toasts), set the LLM key (invalid key → error toast, nothing
   stored; valid → "configured"), and **toggle the display mode** to see the
   same admin under both renderers. Drive keyboard-only for the a11y criterion.
9. **Specs** (colocated, flat `test()`, absolute imports): the admin
   declaration/scheduler derivation headlessly (navigation, selection, search,
   each Action's request→confirm→complete and request→cancel, returned `Cmd`s
   asserted as inert data); the **authorization-boundary matrix** —
   anonymous/guest/admin × every admin route (redirect/403/allow) — and the
   **CSRF-rejection** path on every state-changing route (phase-6 gate); the
   settings store (write-only: a spec proves the stored/returned value is never
   the plaintext key, and the key never appears in a log/URL); the invite flow
   (link shown once, not re-fetchable); the **mode-parity** spec (one scheduled
   state, both renderers, equal behavior). Content query functions are stubbed
   at the `Db`/store seam so the admin specs stay fast and deterministic.
10. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option not
    null/undefined, Result not throw; exhaustive `match` over `Role`, resource
    kinds, action verbs, settings fields, and submission state; data-last
    pipelines (`pipe`/`cast`/`proc`); Prettier `printWidth: 50`; **zero new
    dependencies**, no native bindings; **no new package** (verify the runner
    scripts need no new `cd`-line and that plggmatic builds before plggpress —
    correct the order if a predecessor left it wrong, per the wiring note).

## Quality Gate

**Acceptance criteria**

1. **Declared, not hand-rolled (D1):** the admin's content browsing, account/
   invite management, and site settings are expressed as ticket 09
   Resources/Menus/views/Actions and run via `schedule()`; no hand-written
   `Model`/`Msg`/`update`/URL codec exists in the admin (the scheduler owns
   them). The content Resources call ticket 16's query functions **in-process**
   (no HTTP round-trip inside plggpress).
2. **Mode-parity proof (D10):** the exact same scheduled declaration renders
   through ticket 10's multi-column renderer and ticket 11's single-column
   renderer with a runtime switch; a spec drives one scheduled state through
   both and asserts behavioral/semantic parity; no mode concept leaks into the
   admin declaration.
3. **Authorization boundary (Phase 6 gate):** every admin route is guarded —
   anonymous → login redirect, authenticated guest/non-member → 403 on
   admin-only surfaces, `admin` → allow — decided by ticket 18's `roleOf` with
   exhaustive `match`; the boundary matrix (anonymous/guest/admin × every
   route) is spec-asserted, and every state-changing Action rejects a
   missing/invalid CSRF token.
4. **Invites & roles (D7):** the admin mints a single-use invite and renders
   the **shown-once** copy-paste link; grant/revoke are Actions (revoke behind
   a confirm dialog); revocation is instant (ticket 18's single `DELETE`); no
   SMTP/mailer/email surface appears anywhere in the diff.
5. **Secrets posture (D12), recorded & enforced:** the operator LLM API key is
   write-only from the UI, validated through the `plgg-kit` seam, stored in the
   runtime settings store (never `SiteConfig`, never the content index, never
   the git corpus), and never returned to the client, logged, or placed in a
   URL — a spec proves the stored/returned value is not the plaintext. The
   design note records at-rest encryption + rotation as ticket 28's.
6. **Accessibility / keyboard-only:** the admin is fully operable keyboard-only
   (invite mint, role revoke through the dialog, settings save); the confirm
   dialog now manages focus (trap + return) — ticket 12's deferral is retired
   here (or its blocking research is resolved and the resolution recorded);
   landmarks/labels hold under both renderers.
7. **Dual-mode topology intact (D5):** `plggpress build` static output is
   byte-identical before/after (empty `diff -r`); the admin is served-only,
   mounted **only** at `pressServeWeb`'s seam.
8. **No escape hatches, zero new deps, no new package, coverage:** `grep` finds
   no `as `/`any`/`ts-ignore` in new modules; no new dependency in any
   `package.json`; no new package (`build.sh`/`npm-install.sh`/`check-all.sh`
   gain no new `cd`/`test-*` line) and plggmatic builds before plggpress; a
   fresh `check-all.sh` is green with plggpress and plggmatic above their >90
   four-metric thresholds.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean), `./scripts/test-plggpress.sh`, and
`./scripts/test-plggmatic.sh` and paste the gate lines (including the
authorization-boundary matrix and CSRF specs). Byte-identity: `npx plggpress
build` into two dirs before/after and paste the empty `diff -r`. Serve smoke:
from `packages/guide`, `npx plggpress serve --port <p>` (ticket 14/19), then
`curl` `/admin` **unauthenticated** (expect a login redirect), then drive the
authenticated flow in a **real browser** (criterion 6's keyboard-only sequence
+ the display-mode toggle) and paste evidence — the mode-parity screenshots at
a ≥900px and a <900px viewport (Phase-4/6 have no preview env; side-by-side is
the visual check). Then a **fresh** `scripts/check-all.sh` (clean rebuild —
stale dists must not mask the plggpress→plggmatic edge or a build-order slip)
must be green end to end.

**Gate**

All eight acceptance criteria hold objectively AND the fresh `check-all.sh` is
green AND the browser drive (including keyboard-only operation and the
mode-parity toggle) passes. A hand-rolled admin TEA loop bypassing the
scheduler, a mode concept in the admin declaration, a missing
authorization-boundary or CSRF spec on any admin route, the LLM key ever
returned/logged/in a URL or stored in the corpus or the derived index, an
un-trapped confirm dialog, a non-empty SSG diff, an escape hatch, a new
dependency, a new package, a wrong build order, or a coverage dip fails the
ticket.

## Considerations

- **First real scheduler consumer — expect vocabulary gaps.** If the admin
  needs a declaration concept ticket 09 didn't ship (e.g. a compound
  list+search+paging view, or an Action that reads before confirming), **extend
  ticket 09's vocabulary** (its Considerations invite this — "if the design
  demands splitting, split") rather than forking a parallel model in plggpress.
  Record any such amendment; a fork here would defeat D1.
- **Richer content filtering deferred (ticket 16's hand-off).** Ticket 16
  deferred MicroCMS-style `filters=`/`fields=` *"until the admin UI needs it —
  note it in ticket 20/29 if the admin UI needs it."* If the members/content
  lists need server-side filtering beyond `limit`/`offset`/`orderBy`/`q`, that
  is a ticket-16 extension (the query layer), not a query string hand-built in
  the admin — record the trigger; do not string-assemble SQL.
- **Focus-trap dependency risk.** Criterion 6 assumes ticket 12's confirm
  dialog can trap/return focus. Ticket 12 tied that to the ref/post-paint
  research `20260613183139`. If that seam is still unbuilt when this ticket is
  driven, resolving it (or landing a minimal focus-management path) is
  **in-scope** for the keyboard-only bar — do not ship an un-trapped modal on a
  security surface; if it must slip, stop and re-sequence rather than lowering
  the a11y gate.
- **LLM key lifecycle is ticket 28's.** This ticket fixes the *posture*
  (write-only, out of corpus/index, validated) but not at-rest encryption, a
  rotation drill, or the state-directory/backup story — those are ticket 28
  (production topology & operations). Keep the settings store
  path-parameterized and the key field write-only so 28 wraps encryption at the
  seam without a UI change.
- **Guest capabilities are minimal now.** The `guest` role's admin surface is
  intentionally thin in this ticket (it exists so the authorization matrix has
  a real second actor); guests' collaborative surfaces — requests/comments
  (ticket 21), article editing/revisions (ticket 22), media (ticket 23) — land
  in phase 7. Model the guard so adding a guest-visible surface is a data/role
  decision, not a re-architecture.
- **RAG/agent settings are stubs here.** The LLM key toggles the *opt-in* tiers
  (D11/D12), but the embeddings index (ticket 24) and voice agent (ticket 25)
  are phases 8/9; the settings surface exposes the key and a `configured|absent`
  status only. Verify the **degraded** path (no key → RAG/agent features hidden
  or disabled) stays honest, per the roadmap's phase-8/9 gate.
- **MCP/plugin-export surfaces later.** Ticket 30's Claude Code plugin export
  and tickets 26/27's MCP server will want an admin settings surface too; leave
  the settings model open (a closed `SettingsField` union that grows by a
  compile-visible variant) so those arrive without reshaping the screen.
