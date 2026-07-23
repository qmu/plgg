---
created_at: 2026-07-04T14:30:23+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, DB, Infrastructure]
effort:
commit_hash: 6e0250c
category: Changed
depends_on: [20260704143016-plggpress-content-index-and-delivery-api.md, 20260704143022-guest-editing-and-revisions.md]
---

# Media/asset management on a git-primary corpus: authenticated binary upload into DB-only staging, content-addressed asset storage, admin-mediated export into the git-tracked assets tree, a derived+rebuildable media index served over the delivery API, and path-/type-/size-safety on every write

## Overview

Phase 7 (Collaboration), ticket **23** of the plggpress/plggmatic roadmap —
the last ticket of the phase, and the one that lets a stakeholder's or an
admin's article carry **images and downloadable files**, not just text.
Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. When this ticket
and that document disagree, that document wins until amended.

This ticket is the **binary counterpart** to ticket 22. Ticket 22 (guest
article editing) ships the reconciliation pattern for *authored text* on a
git-primary corpus — DB-only draft staging, an optimistic base check, and an
**admin-mediated export back into the git content tree** that restores the
git-primary invariant. Ticket 22 explicitly stops at Markdown text and hands
binary assets here: its scope wall reads *"media/asset upload is ticket 23 (so
no file-input control and no image upload here — a draft referencing an image
assumes ticket 23's asset)"*, and its Considerations restate *"Media in drafts
belongs to ticket 23. A draft may reference an image path, but uploading the
asset is ticket 23; keep `publishDraft` agnostic to assets (it writes Markdown
text only) so ticket 23 layers asset handling without reshaping the publish
flow."* This ticket cashes that in: it must layer asset upload/publish
**beside** ticket 22's `publishDraft` **without** reshaping it — a draft body
that references `/public/img/x.png` renders and publishes unchanged; this
ticket is what puts `x.png` under the assets tree.

The governing decisions, transcribed so an implementer need not open the spec:

- **D4** — *"Content source of truth — **Git/filesystem primary, SQLite is a
  derived, rebuildable index.** RAG, search, requests/comments live DB-only.
  Revisit SQLite-primary only when guest web editing of articles ships."* A
  media asset is **content**, so the *published* asset is **git-primary**: its
  bytes live as a real file under the site's git-tracked **assets directory**
  (today `AppOptions.assetsDir` / `PressOptions.assetsDir`, conventionally
  `public/`, mirrored verbatim into the SSG output by `copyAssets` — see Key
  Files). Losing the SQLite side costs nothing but a rebuild: any **media
  index** this ticket adds (dimensions, MIME, byte size, referencing
  documents) is **derived and rebuildable from the asset files on disk**,
  exactly as ticket 16's content index is derived from the Markdown corpus.
  The only DB-primary, non-derivable rows this ticket introduces are **upload
  staging** — an uploaded-but-not-yet-published asset, authored in the browser
  and not yet in git — which is the **same category** ticket 22 already blessed
  for drafts (*"drafts and revisions are DB-only authored staging, exactly the
  category D4 already blesses for 'requests/comments live DB-only'"*). Publish
  = export the staged bytes into the git assets tree, restoring the git-primary
  invariant for the finished asset. This ticket does **not** re-open the D4
  flip; ticket 22 owns that verdict and this ticket inherits it (default:
  published content git-primary, staging DB-only).

- **D5** — *"Production topology — **Dual-mode**: public reader stays SSG/CDN
  (GitHub Pages); dynamic features (/admin, API, RAG, agent) run as a separate
  always-on served instance sharing one config."* Upload, staging, and
  publish are **served-only** (the dynamic instance, ticket 14's
  `pressServeWeb` mount seam). The public reader serves published assets as
  plain static files the SSG already copied (`copyAssets`) — **byte-untouched
  until an admin publishes** a staged asset into the assets tree, from which
  the *next* SSG build (or the CDN mirror of the assets dir) serves it. Upload
  never mutates SSG output directly.

- **D7** — *"roles as an app-side **membership table** keyed by Subject
  (instantly revocable) … invites as copy-paste links."* Upload is a **guest**
  write capability layered exactly like ticket 22's draft editing: a guest may
  upload and manage **their own** staged assets; **only an `admin` may publish**
  an asset into the git assets tree (and only an admin may delete a *published*
  asset). Anonymous → login redirect. This reuses ticket 22's/20's route-seam
  authorization (`adminGuard`, the `Role = "admin" | "guest"` union consumed
  with exhaustive `match`, the author-subject ownership predicate) — *adding a
  guest media surface is a data/role decision, not a re-architecture*.

- **D8** — *"custom content models — Both layers, one truth: YAML-subset
  frontmatter parser built on plgg-parser, validated against caster-backed
  content-model types declared in config."* A media **reference in
  frontmatter** (e.g. `hero: /public/img/hero.png`) is, for now, a **`text`
  field** validated by ticket 17's `casterOf` — ticket 17's `FieldType` sum is
  `text | number | boolean | list | group` and deliberately has **no** media
  type yet (its Considerations: new field kinds are added "*only when a real
  consumer earns them*"). This ticket does **not** add a media `FieldType`; it
  MAY add an **optional cross-check** (a bound `text` field whose value looks
  like an assets path is verified to resolve to an existing/published asset) as
  a `checkModels`-adjacent warning — flagged, not required (see Considerations).

Phase 7 constraints honored throughout (from the spec's "Known constraints" and
the Phase 6/7 gate): every state-changing route is **authorization-guarded and
CSRF-protected** (ticket 19's token); **no SMTP/mailer**; all untrusted input
(filename, declared MIME, size, query params) parsed through plgg casters into
closed unions / bounded numbers; **zero new dependencies**, no native bindings,
no `as`/`any`/`ts-ignore`; coverage ≥90 on all four metrics; the SSG reader path
stays byte-untouched until a publish writes a file.

### The one genuinely novel problem: binary upload with no multipart parser

Tickets 21 and 22 handle only **text** bodies. plgg-http/plgg-server have **no
multipart/form-data parser** — `packages/plgg-http/src/Http/model/Form.ts`'s
`parseForm` handles `application/x-www-form-urlencoded` **only**, and the seam
lands text bodies in `HttpRequest.body`. But a binary body **does** already
have a seam: `packages/plgg-http/src/Http/model/HttpRequest.ts` carries
`bytes: Option<Uint8Array>` ("*the raw request bytes, present only when the
body was ingested as binary*") with a `bytes(request)` accessor. **The default
this ticket implements** (unless the design step proves it untenable):
**single-asset raw binary upload** — one asset per request, bytes read from
`HttpRequest.bytes`, filename + declared content-type carried as request
metadata (a query param / header cast to a **closed union of allowed types**),
CSRF token on the mutation. This needs **no new parsing vocabulary** and fits
the existing binary-body seam. Hand-rolling a zero-dep multipart parser (to
accept a multi-file `<form enctype="multipart/form-data">` in one request) is
the **revisit trigger** if a real multi-file admin UI earns it — and, per the
sibling "extend the vocabulary *there*" discipline, it would be **added to
plgg-http** (beside `parseForm`), never string-parsed inside plggpress. The
design step records which path is taken.

Scope walls (siblings own the rest): the draft/revision store, the editor
component, `publishDraft`, `checkBase`, and the export-to-git reconciliation for
**text** are **ticket 22's** (consumed and paralleled, not re-built — a draft
referencing an asset is ticket 22's, the asset itself is this ticket's); the
derived content index, `documents`/`chunks`/`collections`, `content_hash`,
`syncDocument`/`getDocument`/`listCollection`, and the `route("/api", …)` mount
are **ticket 16's** (consumed to add a media listing endpoint and to re-index
documents whose asset references changed — this ticket does **not** mutate the
derived-index document/chunk schema); the frontmatter parser, `foldYaml`,
`ContentModel`/`casterOf` are **ticket 17's** (consumed if the optional
reference cross-check is built); the scheduler vocabulary, both renderers, the
confirm/toast/form components, `adminGuard`/`roleOf`, the session/CSRF surface,
and the `/admin` mount are **ticket 20/19's** (consumed); requests/comments are
**ticket 21's** (this ticket adds **no** attachment-on-message surface — ticket
21 is text-only by its own scope; message attachments, if ever wanted, are a
follow-up that reuses this ticket's asset store); the durable stakeholder store
is **ticket 21's**; RAG/agent are phases 8/9. Git *commit/push* of the written
asset file is an operations concern (**ticket 28**, which also owns the
backup/restore drill) — this ticket writes the file into the working tree and
stops there (see Considerations), exactly as ticket 22 does for Markdown.

## Policies

- `workaholic:design` / `policies/security.md` — this ticket adds the project's
  **first binary write path from untrusted browser input onto the filesystem**,
  a strictly larger attack surface than ticket 22's text export. Four lines of
  defense, all enforced here: (a) **authorization** — the closed `Role`
  (`admin | guest`, ticket 18) consumed with exhaustive `match` at the route
  seam: a guest may upload and mutate only **their own** staged assets
  (author-subject check on every staging mutation), only an `admin` may
  `publish` (export bytes into the git assets tree) or delete a published
  asset; anonymous → login redirect; every state-changing route carries ticket
  19's CSRF token. (b) **Type + size gating on ingest** — the declared
  content-type is cast to a **closed union of allowed MIME types**; the byte
  length is **hard-capped** (an oversize or wrong-type upload is a typed `Err`,
  never a stored file); the stored bytes are **content-addressed** (a
  `content_hash` over the bytes, mirroring ticket 16's `documents.content_hash`
  and ticket 22's atomic write) so an asset is deduplicated and its identity is
  its content, not a client-chosen name. (c) **`image/svg+xml` is an active-content
  vector** — an SVG can carry `<script>`/`onload`, so the reader would execute
  it if served inline from the same origin. This ticket must **either** exclude
  SVG from the allowed-type union **or** neutralize it (serve published assets
  with a hardening response posture — `Content-Disposition: attachment` /
  `X-Content-Type-Options: nosniff`, and keep SVG out of inline `<img>`
  contexts); the default is **exclude SVG** until a consumer earns it, recorded
  in the allowed-type union's doc comment. This is the binary analogue of
  ticket 22's bounded-Markdown XSS boundary. (d) **Path-safety on export** —
  identical discipline to ticket 22: the target asset path is **canonicalized
  and asserted to stay strictly within the configured assets directory** (no
  `..`, no absolute escape, no symlink hop) *before* any filesystem write, and
  the stored filename is derived from the content hash + a sanitized extension,
  never used verbatim from the client. A crafted upload cannot write outside the
  assets tree.
- `workaholic:implementation` / `policies/recovery.md` — D4 is a recoverability
  decision and this ticket keeps both sides honest. **Published assets stay
  git-primary and fully rebuildable** — they are ordinary files under the git
  assets tree, so git *is* their backup (ticket 28's DB backup/restore drill
  does not need to cover them, only the DB). Any **media index** rows are
  **derived**: a spec must drop the media index and rebuild it from the asset
  files alone (parallel to ticket 16's `rebuildIndex` invariant). The only
  DB-primary rows — **upload staging** — live in a **distinct, migration-defined
  table namespace** separate from ticket 16's derived index (a dropped derived
  index still rebuilds; staged-but-unpublished bytes are the part that shares
  ticket 22's draft-staging backup story). **Publish must be atomic and
  idempotent**: the byte write (temp file + rename, mirroring the atomic-dist
  discipline in `project_bundler_flake_atomic_publish`), the staging→published
  status flip, the media-index upsert, and any ticket-16 document re-index either
  all take effect or none do; a crash mid-publish leaves neither a half-written
  asset file nor a staging row marked published-but-not-exported. Re-publishing
  the same content-hash is a no-op (idempotent).
- `workaholic:implementation` / `policies/test.md` — the >90 four-metric
  coverage doctrine, co-located `.spec.ts` (flat `test()`, absolute imports),
  and "test against the real engine": the staging store and publish specs run
  against **real `node:sqlite`** through plgg-sql's `Db` seam and a real temp
  assets directory, mirroring the plgg-sql / plgg-db-migration / plgg-auth
  testkits. The security-critical branches — the **authorization matrix**
  (anonymous / guest-owner / guest-non-owner / admin × each upload/publish/
  delete route), the **type-/size-rejection** table, and the
  **path-traversal-rejection** table — are enumerated as **required** specs, not
  left to line-count luck. plggpress is already gated ≥90 (ticket 02 makes a
  missing config a hard failure); every new module clears the gate from its first
  commit.
- `workaholic:operation` / `policies/delivery.md` — **applies only on the
  new-package contingency** (below). The default in-plggpress placement touches
  **no** runner script. If the design chooses a separate package for the media
  store, `scripts/build.sh` is *publish-order authority* (order is sed-derived
  from the exact `cd $REPO_ROOT/packages/<name> && npm run build` lines): the new
  package is wired after `plgg-sql`/`plgg-db-migration`/`plgg-content`, before
  plggpress, with a matching `npm-install.sh` line and a `test-*.sh` in
  `check-all.sh`.
- `workaholic:design` / `policies/accessibility.md` — the upload control and the
  media browser extend ticket 20's keyboard-only admin bar: the file-select
  control, the per-asset publish/delete Actions, and the destructive-delete
  confirmation reuse ticket 12/20's focus-managed dialog and must be operable
  keyboard-only; every image surfaced in the media browser carries an `alt`
  affordance (an `alt`/`title` captured at upload or edited in the browser). No
  mouse-only affordance on any media control.

## Key Files

- `packages/plggpress/src/Media/` — **new** feature dir (house
  `model/`/`usecase/` layout) holding the asset domain, the staging store seam,
  the type/size gate, the content-address hasher, the publish/export usecase,
  the media index, and the upload/browser routes. Lands beside ticket 22's
  `src/Editing/`, ticket 16's `src/DeliveryApi/`, and ticket 21's `src/Collab/`;
  **no new package** by default (it lives inside plggpress, already wired and
  gated) — so **no new `cd`-line** in `build.sh`/`npm-install.sh` and **no new
  `test-*.sh`** in `check-all.sh`.
- `packages/plggpress/src/Media/model/Asset.ts`, `model/AssetStatus.ts`,
  `model/MediaType.ts` (proposed) — the `Asset` (id, `contentHash: Str`,
  `mediaType`, `byteSize`, target assets-relative `path`, `authorSubject`,
  optional `alt`, `status`, timestamps), the **closed** `AssetStatus` union
  (`staged | published | discarded`) folded with exhaustive `match`, and the
  **closed** `MediaType` union of **allowed** MIME types (default: `image/png |
  image/jpeg | image/webp | image/gif | application/pdf` — **SVG excluded by
  default**, per security policy (c); the doc comment is the normative
  allow-list and states the SVG exclusion). Each carries an `as*` caster that
  `Err`s on anything outside the set.
- `packages/plggpress/src/Media/usecase/mediaMigrations.ts` (proposed) — the
  `media_assets` (staging + published metadata) DDL as plgg-db-migration
  `-- migrate:up/down` bodies, in a **table namespace distinct from ticket 16's
  derived index** (recovery policy). Runs through the same migrator ticket 16/22
  use. Staging rows are DB-primary; published-asset metadata is a derived,
  rebuildable projection of the on-disk files.
- `packages/plggpress/src/Media/usecase/stagingStore.ts` (proposed) —
  `stageAsset`/`getAsset`/`listAssets`/`discardAsset`, each `Db`-taking,
  transactional, on the typed `Result`/`PromisedResult` channel; the
  author-subject ownership predicate is enforced **in the store seam**, not only
  the route (mirrors ticket 22's `draftStore` and plgg-auth's `sqlStore`).
- `packages/plggpress/src/Media/usecase/ingestUpload.ts` (proposed) — the ingest
  gate: read `bytes(request)`, reject an absent/oversize body (bounded, hard-cap)
  or a `mediaType` outside the closed union (typed `Err`, no write), compute the
  `content_hash` over the bytes, and stage the asset (bytes in a staging area,
  metadata via `stagingStore`). Pure of HTTP beyond reading the request seam.
- `packages/plggpress/src/Media/usecase/publishAsset.ts` (proposed) — the
  **admin-mediated export**, the binary parallel of ticket 22's `publishDraft`:
  derive the assets-relative filename from `content_hash` + sanitized extension,
  **path-safety-check** it against the configured assets dir (canonicalize;
  reject `..`/absolute/symlink escape), write the bytes **atomically** (temp file
  + rename), upsert the media index, flip status to `published`, and — if the
  asset is newly referenced by documents — call ticket 16's `syncDocument` to
  re-index those pages. Atomic and idempotent (same content-hash ⇒ no-op).
- `packages/plggpress/src/Media/usecase/rebuildMediaIndex.ts` (proposed) — walk
  the git assets tree, hash each file, and reconstruct the **derived** media
  index from the files alone (D4 recoverability: dropped index → one rebuild →
  identical index). Parallels ticket 16's `rebuildIndex`.
- `packages/plggpress/src/Media/usecase/mediaApi.ts` (proposed) — a `plgg-server`
  `Web` sub-app: `GET` a **read-only, public** media listing (published assets
  only — path, MIME, size, alt), returned via `jsonResponse`, mounted **beside**
  ticket 16's delivery API at the `route("/api", …)` seam (e.g.
  `GET /api/media`). Read-only and GET-only, like ticket 16's delivery API;
  staged assets are **never** listed here.
- `packages/plggpress/src/Media/usecase/uploadApi.ts` (proposed) — the guarded
  upload/manage sub-app: `POST` upload (guest-owner or admin, `ingestUpload`),
  `POST` publish (admin only, behind the focus-managed confirm dialog,
  `publishAsset`), `POST`/delete discard (guest-owner staged, admin published);
  every mutation verifies ticket 19's CSRF token. Mounted on ticket 14's
  `pressServeWeb` seam under the guarded subtree **and only there**.
- `packages/plgg-http/src/Http/model/HttpRequest.ts` — the **binary-body seam**
  this ticket depends on: `bytes: Option<Uint8Array>` (line 17) and the
  `bytes(request)` accessor (line ~75), *"present only when the body was ingested
  as binary."* Consumed, not modified (unless the design step chooses the
  multipart contingency, which extends **plgg-http**, not plggpress).
- `packages/plgg-http/src/Http/model/Form.ts` — `parseForm` (line 47),
  `application/x-www-form-urlencoded` **only**; the evidence that **no multipart
  parser exists** and the module the contingency would extend beside.
- `packages/plgg-http/src/Http/model/HttpResponse.ts` — `jsonResponse` (line 91)
  the media routes return; the hardening response posture (SVG policy (c)) is set
  here on the served asset response if published assets are ever served *through*
  the dynamic instance rather than purely as static files. Consumed.
- `packages/plgg-server/src/Routing/model/Web.ts` — `web()` (36), `get` (56),
  `post` (60), `use` (90), `route(basePath, sub)` (118); the sub-apps are built
  from these and mounted with prefix-scoped guards. Consumed, not modified.
- `packages/plggpress/src/framework/App/model/AppOptions.ts` —
  `assetsDir: SoftStr` (*"static files copied verbatim"*) and `contentDir`;
  `packages/plggpress/src/Press/model/PressOptions.ts` — `assetsDir` mirrored
  onto the press options. This **is the git-primary media storage location**:
  published assets are files under `assetsDir`. Consumed to resolve the write
  target.
- `packages/plggpress/src/framework/Build/usecase/build.ts` — `copyAssets`
  (imported line 17; called line 124 `copyAssets(opts.assetsDir)`) mirrors the
  assets tree **verbatim** into the SSG output; published assets flow to the
  public reader through this existing, unmodified path (D5 byte-identity — the
  reader path is byte-untouched until a publish adds a file to the assets tree).
  Consumed, not modified.
- `packages/plgg-content/src/Ingest/usecase/syncDocument.ts`,
  `src/Query/usecase/getDocument.ts` — **ticket 16's** incremental re-index
  (called after publish for pages whose asset references changed) and query seam.
  Delivered by ticket 16; consumed, not modified. The media listing endpoint may
  reuse ticket 16's `plgg-content` `Db` seam or keep the media index in the same
  index file — the design step decides; either way the media index is **derived**.
- `packages/plggpress/src/Editing/usecase/publishDraft.ts`,
  `usecase/renderPreview.ts` — **ticket 22's** text export and pure preview; this
  ticket keeps them **agnostic to assets** (ticket 22's Considerations), so a
  draft/preview referencing `/public/img/x.png` needs no ticket-22 change — the
  reference is plain Markdown that resolves once this ticket has published the
  asset. Consumed, not modified.
- `packages/plggpress/src/Admin/usecase/adminDeclaration.ts`,
  `usecase/adminGuard.ts` — **ticket 20's** scheduler declaration (a **Media
  Resource** — asset list + per-asset detail with publish/delete Actions — is
  declared alongside, not hand-rolled) and the route-seam authorization the
  media routes extend (guest-owner / admin gating). Delivered by ticket 20;
  consumed and extended by data/role, not re-architected.
- `packages/plggpress/src/server/pressServer.ts` — **ticket 14's** `pressServeWeb`
  mount seam, where tickets 16/19/20/22 mount their sub-apps; the media routes
  mount here (public listing at the `/api` seam, guarded upload/manage under the
  admin subtree) **and only here**. Delivered by ticket 14, extended by
  16/19/20/22; this ticket adds the media routes.
- `packages/plgg-sql/src/Db/`, `packages/plgg-sql/src/Sql/`,
  `packages/plgg-db-migration/src/testkit/migrator.ts` +
  `src/testkit/sqliteDb.ts` — the `Db` seam, the `transaction` pipeline step, and
  the migrator/harness the store + migrations ride (real `node:sqlite`).
  Consumed, not modified.
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` — `assetsDir`/
  `contentDir` resolution and ticket 17's `models` (used only if the optional
  frontmatter media-reference cross-check is built). Consumed.
- `packages/guide/**/*.md` and `packages/guide/site.config.ts` — the real corpus
  and config; the demo (Implementation Step 8) uploads and publishes an image
  into a *scratch copy* of this tree, references it from a page, and verifies the
  SSG picks it up. The guide has **no `public/` assets dir today**
  (`ls packages/guide` shows none) — the demo creates one, so this is also the
  first exercise of the assets pipeline on the guide.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record (D4/D5/D7/D8); the design step writes its upload-topology decision
  (raw-binary vs multipart contingency; SVG posture) into a short
  `.workaholic/specs/` note.

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143022-guest-editing-and-revisions.md`
  delivers the git-primary-corpus reconciliation pattern — DB-only staging, an
  optimistic base check, path-safety on export, atomic file write, admin-mediated
  publish, and the guest-owns-own-staging / admin-publishes authorization. This
  ticket is its **binary parallel**; ticket 22's scope and Considerations
  explicitly hand media here (*"uploading the asset is ticket 23"*) and require
  `publishDraft` be kept **asset-agnostic** so this ticket layers assets without
  reshaping the text publish flow.
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  delivers the derived, rebuildable index pattern (`content_hash`,
  `rebuildIndex`, `syncDocument`), the `route("/api", …)` delivery-API seam this
  ticket adds a media listing beside, and the "derived-and-rebuildable" D4
  discipline the media index copies. Its Considerations already anticipate an
  asset-bearing consumer; this ticket must **not** mutate its document/chunk
  schema and must **not** hand-write index/FTS5 SQL.
- **Transitive foundation (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143017-frontmatter-yaml-subset-and-content-models.md`
  (the `text` `FieldType` / `casterOf` a media reference is validated by, and the
  note that new field kinds are earned, not assumed);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143020-admin-ui-on-scheduler.md`
  (the scheduler declaration + `adminGuard` the Media Resource is declared on);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143019-plggpress-oidc-rp-integration.md`
  (the RP session, `requireRole`, and `requireCsrf` the media routes consume);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  (the `pressServeWeb` mount seam and the dual-mode topology — SSG reader stays
  byte-untouched);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143018-account-domain-roles-and-invites.md`
  (the `Role` union and membership table the ownership/authorization decisions
  read).
- `.workaholic/tickets/archive/work-20260703-220007/20260703222255-plgg-auth-persistence-and-hardening.md`
  (story `.workaholic/stories/work-20260703-220007.md`) — the atomic `take*` /
  `sqlStore` / row-caster discipline the staging store copies (bound values,
  mis-shaped row → `None`, transactional writes); the publish transaction follows
  the same single-transaction rule so an asset can't be double-published or torn
  under a race.
- `.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md`
  — the SSG core and the `copyAssets` verbatim-mirror path; publishing writes a
  file the *next* SSG build (or the CDN mirror of the assets dir) serves, so the
  reader path stays the static D5 half.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — established plggpress's
  direct-deps + `src/<Feature>/` layout the `Media/` feature lands beside.
- **Downstream / operations:** ticket 28 (production topology) owns the git
  commit/push of the written asset file and the DB backup/restore drill (published
  assets are git-backed; only the staging DB needs the drill); ticket 21
  (requests/comments) is text-only and could later reuse this asset store for
  message attachments (a follow-up, not this ticket).
- **Concern 51**
  (`.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`) — keep
  plggpress's export-map `types`+`default` widening intact if the barrel grows.
  **Concern**
  (`.workaholic/concerns/51-hot-reload-does-not-refresh-config.md`) — hot reload
  does not refresh `site.config.ts`; a publish that adds an asset needs a
  served-instance media-index refresh (note in Considerations). **Sibling ticket
  02** (`…143002-harden-coverage-gate-defaults.md`) makes the ≥90 gate
  load-bearing.

**Wiring note (load-bearing):** **no new package by default** — the media
feature is inside plggpress. So **no** new `cd $REPO_ROOT/packages/<name> &&
npm run build` line enters `scripts/build.sh`/`scripts/npm-install.sh` and **no**
new `test-*.sh` enters `scripts/check-all.sh`. plggpress already depends on
`plgg-md`, `plgg-view`, `plgg-sql`, `plgg-db-migration`, `plgg-content`, and
`plgg-auth` (via tickets 07/16/19/22), and those must build **before**
plggpress; tickets 16/20/22 already invert the order. This ticket's job is to
**verify** the order holds and correct it with the exact `cd`-line format only if
a predecessor left it wrong. A fresh `check-all.sh` is the arbiter. **Contingency
(separate media-store package only):** wire the exact `cd`-line into `build.sh`
(after `plgg-sql`/`plgg-db-migration`/`plgg-content`, before plggpress), a
matching `npm install` line, a `test-*.sh` in `check-all.sh`, and a
`plgg-test.config.json` (threshold 90) — with rationale in the design note.

## Implementation Steps

1. **Design step (before any `src/` edit).** Record, in a short
   `.workaholic/specs/` note (or the PR description) and present at the drive
   approval gate: (a) **the upload topology** — default **single-asset raw binary
   upload** via `HttpRequest.bytes`, or the **multipart contingency** (a
   zero-dep parser **added to plgg-http** beside `parseForm`) if a multi-file UI
   is judged necessary now — with rationale. (b) **The allowed-type union and the
   SVG posture** — the closed `MediaType` set and whether SVG is excluded
   (default) or neutralized. (c) **The media-index placement** — a `media_assets`
   table in plggpress over ticket 16's `plgg-content` `Db`, or the in-plggpress
   store; and the invariant that published-asset metadata is **derived** while
   staging rows are **DB-primary** (distinct table namespace, per recovery
   policy). (d) **The reconciliation flow** — upload (stage bytes + metadata) →
   admin review → publish (path-check → atomic byte write → media-index upsert →
   status flip → ticket-16 `syncDocument` for referencing pages) → discard —
   with the exact failure branches, paralleling ticket 22's flow. (e) **The
   asset-reference story** — a draft/page references a published asset by its
   assets-relative path (plain Markdown/frontmatter `text`), with the optional
   `checkModels` cross-check flagged as follow-up (Considerations). Implement
   after agreement.
2. **Models + migrations** (`Media/model/`, `usecase/mediaMigrations.ts`): the
   `AssetStatus` and `MediaType` closed unions with `as*` casters (Err outside
   the set); the `Asset` model with `Option`-typed `alt`; the `media_assets` DDL
   as reversible `-- migrate:up/down` bodies in a **distinct table namespace**
   from ticket 16's derived index. Run through the migrator; errors stay on the
   typed channel.
3. **Staging store** (`Media/usecase/stagingStore.ts`): `stageAsset`,
   `getAsset`, `listAssets` (filterable by author + status), `discardAsset` —
   each `Db`-taking, **transactional**, enforcing the **author-subject ownership**
   predicate in the seam (a guest cannot load/mutate another guest's staged
   asset). Status transitions follow a total `match` over `AssetStatus`; illegal
   transitions are typed `Err`.
4. **Ingest gate + content-address** (`Media/usecase/ingestUpload.ts`): read
   `bytes(request)`; reject absent/oversize (bounded, hard-capped byte length) or
   a `mediaType` outside the closed union (typed `Err`, no write); compute
   `content_hash` (Node stdlib `node:crypto`, no new dep) over the bytes; stage
   the bytes (a staging directory or a BLOB — design-step choice) and the
   metadata via `stagingStore`. Idempotent on identical content-hash.
5. **Publish / export-to-assets-tree** (`Media/usecase/publishAsset.ts`,
   admin-only): in **one atomic operation** — derive the assets-relative filename
   from `content_hash` + a **sanitized** extension; **path-safety** (canonicalize
   the target, assert it stays strictly inside `assetsDir`, reject
   `..`/absolute/symlink escape); write the bytes **atomically** (temp file +
   rename); upsert the media index; flip status to `published`; call ticket 16's
   `syncDocument` for any pages that reference the asset. A crash at any point
   leaves neither a half-written file nor a mis-marked row (transaction + rename
   atomicity); re-publishing the same content-hash is a no-op.
6. **Rebuildable media index** (`Media/usecase/rebuildMediaIndex.ts`): walk the
   assets tree, hash each file, reconstruct the derived media-index rows from the
   files alone. A spec drops the index and rebuilds to an identical result (D4).
7. **Delivery + management surfaces**: `mediaApi.ts` — a **read-only, public,
   GET-only** media listing (published assets only) mounted beside ticket 16's
   delivery API at the `route("/api", …)` seam; `uploadApi.ts` — the guarded
   upload/publish/discard sub-app mounted on ticket 14's `pressServeWeb` seam
   **only**, extending ticket 20's `adminGuard`: anonymous → login redirect;
   guest → own staged assets (upload/discard); admin → all assets + publish +
   delete-published; every state-changing route verifies ticket 19's CSRF token.
   Declare a **Media Resource** on ticket 20's scheduler (asset list + detail +
   publish/delete Actions). The SSG (`build`/`copyAssets`) render path stays
   byte-untouched.
8. **Runnable demo / real-browser drive** (proof-of-value, working-style):
   against a scratch copy of `packages/guide` served via `npx plggpress serve`,
   log in as a guest, upload an image (watch it appear staged, private to the
   guest), then log in as admin, review, and publish it into the assets tree;
   reference it from a page (`![](/public/…)`), run a subsequent `plggpress
   build`, and confirm the published image is byte-copied into the SSG output and
   the page renders it. Exercise the **rejection paths** live: an oversize upload
   and a disallowed MIME type are refused; a crafted `..` filename cannot escape
   the assets dir. Drive keyboard-only for the a11y criterion; quote the reject +
   publish evidence in the PR.
9. **Specs** (co-located, flat `test()`, absolute imports, real `node:sqlite` +
   real temp `assetsDir`): store transitions and ownership enforcement; the
   ingest **type-/size-rejection** table; `content_hash` idempotency;
   `publishAsset` atomicity (mid-publish failure leaves no partial state) and the
   **path-traversal-rejection** table (`..`, absolute, symlink); `rebuildMediaIndex`
   (dropped index → identical rebuild); the media listing returns published-only
   (staged assets never leak); the **authorization matrix** (anonymous /
   guest-owner / guest-non-owner / admin × each upload/publish/delete route →
   redirect/403/allow) and **CSRF-rejection** on every state-changing route;
   ticket 16's `syncDocument` stubbed at the `Db` seam so media specs stay fast.
10. **House rules end to end**: no `as`/`any`/`ts-ignore`; `Option` not
    null/undefined, `Result` not throw; exhaustive `match` over `AssetStatus`,
    `MediaType`, `Role`, and publish result; data-last pipelines
    (`pipe`/`cast`/`proc`); prefer `Str`/`asStr` over `SoftStr` in new code where
    seams allow; Prettier `printWidth: 50`; **zero new dependencies**, no native
    bindings (`node:sqlite` behind plgg-sql's `Db` seam is the only DB surface;
    the atomic write and hashing use `node:fs`/`node:crypto` stdlib); **no new
    package** by default (verify the runner scripts need no new `cd`-line and that
    plggpress's deps build before it — correct the order only if a predecessor
    left it wrong).

## Quality Gate

**Acceptance criteria**

1. **Git-primary published assets, derived+rebuildable index (D4):** published
   assets are ordinary files under the git-tracked `assetsDir`; the media index
   is **derived** — a spec drops it and `rebuildMediaIndex` reconstructs an
   identical index from the files alone; only **upload staging** is DB-primary,
   in a **distinct table namespace** from ticket 16's derived index (a spec runs
   ticket 16's `rebuildIndex` and asserts staging rows are untouched).
2. **Type + size + SVG safety:** the declared content-type is cast to a **closed
   allowed-MIME union** (a disallowed type is a typed `Err`, no file written);
   byte length is **hard-capped**; **SVG is excluded by default** (or neutralized
   with the documented hardening posture) — a spec proves a disallowed/oversize
   upload is refused with no filesystem write.
3. **Content-addressed + idempotent:** stored assets are addressed by a
   `content_hash` over their bytes; re-uploading/re-publishing identical content
   is a no-op (spec-proven), mirroring ticket 16's `content_hash` discipline.
4. **Authorization + CSRF (Phase 6/7 discipline extended):** every
   upload/publish/delete route is guarded — anonymous → login redirect; a guest
   reaches only **their own** staged assets (upload/discard); **only admin
   publishes** (and deletes published); the boundary matrix (anonymous /
   guest-owner / guest-non-owner / admin × each route) is spec-asserted and every
   state-changing route rejects a missing/invalid CSRF token. No SMTP/mailer
   anywhere.
5. **Admin-mediated export reconciles to git, atomically:** publish path-safety-
   checks the target, writes the bytes **atomically** (temp + rename) inside
   `assetsDir`, upserts the media index, flips status, and re-indexes any
   referencing pages via ticket 16's `syncDocument`; the operation is **atomic
   and idempotent** (a mid-publish failure leaves no half-written file and no
   mis-marked row); a subsequent `plggpress build` byte-copies the published
   asset into the SSG output (via the unmodified `copyAssets`).
6. **Path-safety enforced:** the traversal table (`..`, absolute path, symlink
   escape) is rejected before any write — a spec proves a crafted upload cannot
   write outside `assetsDir`; the stored filename is derived from the content hash
   + sanitized extension, never used verbatim from the client.
7. **Delivery is read-only + leak-free:** `GET /api/media` (beside ticket 16's
   delivery API) lists **published** assets only via `jsonResponse`; staged
   assets are never listed; the endpoint is GET-only (no write verb registered).
8. **Dual-mode intact (D5) + accessibility + boundary:** the SSG reader path is
   byte-untouched until a publish writes a file (empty `diff -r` on the unchanged
   corpus + assets); ticket 22's `publishDraft`/`renderPreview` are unmodified
   (assets stay agnostic to the text publish flow); the upload/publish controls
   and the destructive-delete confirm are fully keyboard-operable with labelled
   controls and an `alt` affordance.
9. **No escape hatches, zero new deps, no new package (default), coverage:**
   `grep` finds no `as `/`any`/`ts-ignore` in new modules; no new dependency in
   any `package.json`; no new package by default (no new `cd`/`test-*` line) and
   plggpress's deps build before it (or the contingency wires them with the exact
   `cd`-line format); a fresh `check-all.sh` is green with plggpress ≥90 on all
   four metrics.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean) and `./scripts/test-plggpress.sh` and paste
the gate lines (including the authorization matrix, the type-/size-rejection, and
the path-traversal specs). Byte-identity of the unchanged reader path: `npx
plggpress build` into two dirs on the pre-edit corpus before/after the branch and
paste the empty `diff -r`. Reconciliation drive: from a scratch copy of
`packages/guide`, `npx plggpress serve --port <p>` (ticket 14/19/20/22), then in
a **real browser** run Implementation Step 8's full sequence — guest upload
(staged, private), admin review + publish into the assets tree, a page
referencing the asset, a follow-up `plggpress build` byte-copying it into the SSG
output, plus the live rejection of an oversize/disallowed/`..`-crafted upload —
pasting evidence (including the keyboard-only pass). Then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask the
plggpress↔plgg-content/plgg-http edges or a build-order slip) must be green end
to end.

**Gate**

The design step's upload-topology + SVG decision is recorded AND all nine
acceptance criteria hold objectively AND the fresh `check-all.sh` is green AND
the browser reconciliation drive (including the rejection paths and keyboard-only
operation) passes. A write outside `assetsDir`, a disallowed/oversize upload that
lands a file, an executable SVG served inline, a staged asset leaking through the
public listing, a guest reaching another guest's staged asset or publishing, a
non-atomic publish that can strand a half-written file, a mutated derived-index
(ticket 16) schema, a reshaped ticket-22 `publishDraft`, a missing
authorization/CSRF/path-traversal spec, an escape hatch, a new dependency, an
unjustified new package, a wrong build order, or a coverage dip fails the ticket.

## Considerations

- **Binary upload is the one novel seam.** No multipart parser exists
  (`Form.ts`/`parseForm` is urlencoded-only); the default single-asset raw-binary
  path via `HttpRequest.bytes` avoids adding one. If a multi-file admin form is
  later wanted, extend **plgg-http** (a zero-dep multipart parser beside
  `parseForm`), never string-parse a multipart body inside plggpress — the same
  "extend the vocabulary there" discipline tickets 15/16 apply to FTS5 SQL.
- **SVG is active content.** Excluding `image/svg+xml` from the allowed union is
  the fail-safe default (an SVG can carry `<script>`); admitting it later
  requires the hardening posture (attachment disposition / `nosniff` / no inline
  `<img>` from an untrusted source) recorded in the `MediaType` doc comment — a
  ticket amendment, not a quiet parser widening. This is the binary analogue of
  ticket 22's bounded-Markdown boundary.
- **Published assets are git-backed; only staging needs the DB drill.** Because
  published assets are files under the git assets tree, git is their backup and
  ticket 28's DB backup/restore drill need not cover them — only the DB-primary
  staging rows share ticket 22's draft-staging backup story. Keep published-asset
  metadata **derived** so a dropped index rebuilds; do not let it drift into
  DB-primary state (that would re-open D4, which is ticket 22's to decide).
- **Git commit/push is deferred to ticket 28.** This ticket writes the published
  asset into the working tree and updates the derived index; *committing* it (and
  any push/PR automation, and the CDN mirror of the assets dir) is a
  production-operations concern — state this in the `publishAsset` docstring so it
  is not mistaken for a full git/CDN integration, exactly as ticket 22 does for
  Markdown.
- **Served-instance media-index refresh.** Publishing adds a file the served
  instance did not see at boot; hot reload does not refresh `site.config.ts`
  (concern `51-hot-reload-does-not-refresh-config`). The media-index upsert covers
  the new asset row, but a *watcher/reload* for out-of-band asset changes is
  ticket 28's, not this ticket's — note the boundary.
- **Frontmatter media-reference field is deferred.** Ticket 17's `FieldType` sum
  has no media type; a media reference is a `text` path today. An optional
  `checkModels` cross-check (a bound `text` field's value resolves to a published
  asset) is a small follow-up on ticket 17's `casterOf`/`checkModels`, earned
  when a real content model needs it — do **not** add a media `FieldType` here
  (breaking ticket 17's "earned, not assumed" discipline).
- **Message attachments are not this ticket.** Ticket 21 (requests/comments) is
  text-only by its own scope; if attachments on stakeholder messages are later
  wanted, they reuse this ticket's asset store and authorization — a follow-up
  that adds a message↔asset link, not a reshaping of either store.
- **Concurrent uploads of identical content** deduplicate by `content_hash`
  (idempotent publish), so two guests uploading the same bytes converge on one
  published asset; ownership of *staging* rows stays per-author, but the
  published file is content-addressed and shared — record this so it is not
  mistaken for a race bug.

## Final Report

Development completed (Phase-7, the binary counterpart to ticket 22). D4 stance
HELD: git STAYS primary — an uploaded asset is DB-only staged content until an
admin exports it into the git assets tree; the media index is derivable, only the
staged bytes are irreplaceable, and they live in their OWN store. Implemented
across seven committed, tested slices (each behind a fresh green check-all):

- **pt.1 `e1d8bfb`** — AssetStatus (staged|exported|discarded) + transition
  machine + MediaSafety (MIME allowlist / 10 MiB size cap / path-safety) +
  content-addressed Asset (hash = sha256 of the bytes).
- **pt.2 `e01c972`** — reversible schema + openAssetStore (own file, UNIQUE-hash
  dedup, bytes as base64 TEXT since SqlValue is text/num/bool only).
- **pt.3 `b82d86e`** — AssetStore seam + sqlAssetStore driver (findByHash dedup,
  loadBytes read separately).
- **pt.4 `2fa2591`** — uploadAsset (validate type+size+path → dedup by hash →
  store; hash+size computed by the caller so the usecase stays crypto-free) +
  Media barrel.
- **pt.5 `996bcf9`** — publishAsset export-to-git-assets (resolve → path-safety →
  transition staged→exported → atomic write via injected AssetExportFs).
- **pt.6 `0eb331d`** — the media Web: GET /new (CSRF), POST /upload (raw bytes →
  sha256 → uploadAsset), GET /item/:id (binary serve with recorded MIME).
- **pt.7 `6198aa9`** — admin assets Collection + publish-asset Action + the serve
  mount (real fsAssetExportFs, mediaWeb at /media).

### Discovered Insights

- **Insight**: SQLite has no bindable BLOB through the plgg-sql `sql` template —
  SqlValue is `SoftStr | Num | Bool`. Binary rides as **base64 TEXT**; the upload
  Web (node:crypto/Buffer) encodes/sha256s at the seam, the store stays pure, and
  a list never drags the payloads (loadBytes is a separate projection).
  **Context**: the one real divergence from the text-draft (ticket 22) template.
- **Insight**: content-addressing gives **dedup for free** — a UNIQUE hash column
  + findByHash means an identical re-upload returns the existing asset with no
  second row, enforced at the DB and short-circuited in the usecase.
- **Insight**: the whole 4-store serve mount (auth + content + stakeholder + draft
  + asset) is one deeply-nested matchResult fold; each new store adds a
  `.then(matchResult(err, (db) => ...))` layer + a mergeWebs level. The
  brace-balance is the tricky part — the block-body arrow needs `;}` not `),`.

### Remaining (follow-up, not this ticket)

- A production deploy threads a real assets dir (not the mount's placeholder) +
  the served-origin issuer; the media byte-serve could gain caching headers.
- Ticket 24 (RAG) and ticket 25 (voice) build on the now-complete stores.
- Multipart form upload (vs the raw-bytes POST) is a UX nicety left open.
