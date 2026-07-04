---
created_at: 2026-07-04T14:30:22+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, DB]
effort:
commit_hash:
category:
depends_on: [20260704143017-frontmatter-yaml-subset-and-content-models.md, 20260704143020-admin-ui-on-scheduler.md]
---

# Guest co-editing on a git-primary corpus: a browser Markdown editor (textarea + plgg-md live preview), DB-side drafts/revisions, admin-mediated export back to the git content tree, and optimistic base-revision conflict detection — the **D4 revisit trigger**

## Overview

Phase 7 (Collaboration), ticket **22** of the plggpress/plggmatic roadmap —
the phase's hardest ticket and the one the decision record singles out as a
**revisit trigger for its own foundational storage decision**. Approved
decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

The governing decision, transcribed so an implementer need not open the spec:

- **D4** — *"Content source of truth — **Git/filesystem primary, SQLite is a
  derived, rebuildable index.** RAG, search, requests/comments live DB-only.
  **Revisit SQLite-primary only when guest web editing of articles ships.**"*
  That last clause names **this ticket**. Until now every byte of the SQLite
  side has been reconstructable from the Markdown corpus (ticket 16's
  `rebuildIndex` is the proof); losing the DB cost nothing but a rebuild.
  Guest web editing breaks that invariant for the first time: a **draft** is
  authored content that does **not yet exist in git** and therefore is **not
  derivable** from the corpus. This ticket must decide, precisely and on the
  record, **how authored-in-the-browser content reconciles with a git-primary
  corpus** — and whether D4 survives contact with it or must flip to
  SQLite-primary. The default position this ticket implements (unless the
  design step proves it untenable): **published content stays git-primary;
  drafts and revisions are DB-only authored *staging*, exactly the category
  D4 already blesses for "requests/comments live DB-only"; "publishing" is an
  admin-mediated *export back into the git content tree* that restores the
  git-primary invariant for the finished article.** The reconciliation flow is
  the deliverable; the design step (Implementation Step 1) is mandatory and its
  output is the artifact that either confirms D4 or opens the flip.

- The vision (author's words, from the roadmap): plggpress signs in *"invited
  'collaborative guest' project stakeholders"* so that *"stakeholder
  interactions accumulate inside plggpress."* Guest article editing is the
  collaborative surface that lets a stakeholder propose content, not just
  comment on it — the write counterpart to ticket 21's requests/comments.

- **D7** — *"roles as an app-side **membership table** keyed by Subject
  (instantly revocable) … invites as copy-paste links."* Editing is the
  **guest** role's first *write* capability: a guest may create, edit, and
  submit **their own** drafts; **only an `admin` may publish** (export a draft
  to the git tree). Ticket 20 modelled the guard so *"adding a guest-visible
  surface is a data/role decision, not a re-architecture"* — this ticket cashes
  that in as the first guest-writable subtree, and ticket 20 explicitly defers
  *"guest article editing is ticket 22."*

- **D5** — *"Dual-mode: public reader stays SSG/CDN; dynamic features run as a
  separate always-on served instance."* The editor and the draft store are
  **served-only** (the dynamic instance, ticket 14's mount seam). The static
  reader is byte-untouched **until** an admin publishes; publishing writes a
  Markdown file into the content tree, from which the *next* SSG build produces
  the public page. Editing never mutates rendered SSG output directly.

- **D1** — *"Home of the declarative UI scheduler: plggmatic; plggpress is its
  CMS consumer."* The **drafts inbox** (list of drafts, per-draft detail,
  submit/publish/discard Actions) is **declared on ticket 20's scheduler**,
  beside the admin's content/account/settings Resources — it is a new Resource
  + Actions, not a hand-rolled TEA loop. The **editor pane itself** (textarea +
  live preview) is the one bespoke widget the scheduler hosts inside a detail
  view; it is a plgg-view component driven by ticket 06's Cmd/Sub effects for
  debounced autosave and submit.

- **D2** — *"Add Cmd/Sub to plgg-view itself."* The editor's autosave (debounced
  persist of the working body), submit, and publish are **effects**, expressed
  as `Cmd<Msg>` from ticket 06's runtime — not imperative side effects inside
  `update`. Live preview, by contrast, is **pure**: each keystroke folds the
  body into the model and the view re-renders the preview through plgg-md's
  pure render path with **no** effect.

The bounded-Markdown safety boundary is load-bearing and is stated in the
scope: the live preview and the published render both go through **plgg-md's
no-raw-HTML block/inline subset** — there is **no rich-text editor dependency,
no `contenteditable`, no HTML sanitizer to get wrong**. A guest types Markdown
into a plain `<textarea>`; plgg-md parses it into the same `Block`/`Inline` AST
the SSG uses and renders it; anything outside the subset simply does not render
as HTML. That is the whole XSS story, and it is a *consequence of the existing
architecture*, not new code.

Scope walls (siblings own the rest): the scheduler vocabulary, both renderers,
the confirm/toast/form components, `adminGuard`/`roleOf` authorization, the
session/CSRF surface, and the `/admin` mount are **ticket 20's** (consumed, not
re-built — if the drafts inbox needs a vocabulary concept ticket 20/09 lacks,
extend *there*, do not fork); the frontmatter parser, `foldYaml`,
`ContentModel`/`casterOf` validation are **ticket 17's** (consumed to validate a
draft's frontmatter at the publish boundary); the derived content index, its
`content_hash` column, and `syncDocument`/`getDocument` are **ticket 16's**
(consumed to seed a draft's base and to re-index after publish — this ticket
does **not** touch the derived-index schema); requests/comments accumulation is
**ticket 21**; media/asset upload is **ticket 23** (so no file-input control and
no image upload here — a draft referencing an image assumes ticket 23's asset);
RAG/agent are phases 8/9. Git *commit/push* of the written file is an operations
concern (**ticket 28**) — this ticket writes the file into the working tree and
stops there (see Considerations).

## Policies

- `workaholic:design` / `policies/security.md` — this ticket adds the project's
  **first guest-writable surface** and its **first write path from untrusted
  browser input into the git content tree**. Three lines of defense, all
  enforced here: (a) **authorization** — a closed `Role` (`admin | guest` from
  ticket 18) consumed with exhaustive `match` at the route seam: a guest may
  mutate only **their own** drafts (author-subject check on every draft
  mutation), only an `admin` may `publish`; anonymous → login redirect; every
  state-changing Action carries ticket 19's CSRF token. (b) **The bounded
  Markdown subset is the injection boundary** — draft bodies are never rendered
  as raw HTML; preview and publish both go through plgg-md's no-raw-HTML AST, so
  a `<script>` in a draft is inert text, not markup. (c) **Path-safety on
  export** — the target content path is validated (canonicalized and asserted to
  stay strictly within the configured `contentDir`; no `..`, no absolute
  escape, no symlink hop) *before* any filesystem write, so a crafted draft
  cannot write outside the corpus. Frontmatter on a draft is untrusted input and
  is validated through ticket 17's `casterOf` at the publish boundary exactly as
  the build-time `checkModels` validates corpus files (D8's "one truth").
- `workaholic:implementation` / `policies/recovery.md` — D4 is a
  *recoverability* decision, and this ticket is where it is stressed. **Published
  content stays git-primary and fully rebuildable** (ticket 16's `rebuildIndex`
  invariant is preserved: the derived index tables are untouched here). But
  **drafts/revisions are the first non-derivable rows in the SQLite file** — so
  this ticket must (i) place them in a **distinct, migration-defined table
  namespace** clearly separated from the derived index (a dropped derived index
  still rebuilds; the drafts tables are the part that now needs a **backup
  story**, which it hands to ticket 28), and (ii) make **publish atomic and
  idempotent** — the file write, the `published`-revision append, the draft
  status flip, and the ticket-16 re-index either all take effect or none do; a
  crash mid-publish must leave neither a half-written Markdown file nor a draft
  marked published-but-not-exported. The recovery discipline: the git tree is
  always the authority for *published* state; the DB never silently becomes the
  authority for it.
- `workaholic:implementation` / `policies/test.md` — the 90% four-metric
  coverage doctrine, co-located `.spec.ts` (flat `test()`, absolute imports),
  and the "test against the real engine" practice: draft-store and publish specs
  run against **real `node:sqlite`** through plgg-sql's `Db` seam and a real
  temp `contentDir`, mirroring the plgg-sql / plgg-db-migration / plgg-auth
  testkits. The security-critical branches — the **authorization matrix**
  (anonymous / guest-owner / guest-non-owner / admin × each draft/publish route)
  and the **conflict-detection** and **path-traversal-rejection** paths — are
  enumerated as **required** specs, not left to line-count luck. plggpress is
  already gated ≥90 (ticket 02 makes a missing config a hard failure); every new
  module clears the gate from its first commit.
- `workaholic:design` / `policies/accessibility.md` — the editor is a keyboard
  surface a stakeholder uses for real, extending ticket 20's keyboard-only bar.
  The `<textarea>`, the preview region, and the submit/publish Actions must be
  operable keyboard-only, with a labelled editor and a preview exposed as a
  live region or a clearly-labelled complementary landmark; the draft-conflict
  and publish confirmations reuse ticket 12/20's focus-managed dialog. No
  mouse-only affordance on any editing or publishing control.

## Key Files

- `packages/plggpress/src/Editing/` — **new** feature dir (house
  `model/`/`usecase/` layout) holding the draft/revision domain, the store seam,
  the conflict check, the publish/export usecase, and the editor component's
  update/view. Lands beside ticket 20's `src/Admin/` and ticket 16's
  `src/DeliveryApi/`; no new package (it lives inside plggpress, already wired
  and gated) — so **no new `cd`-line** in `build.sh`/`npm-install.sh` and **no
  new `test-*.sh`** in `check-all.sh`.
- `packages/plggpress/src/Editing/model/Draft.ts`, `model/Revision.ts`,
  `model/DraftStatus.ts` (proposed) — the `Draft` (id, target `path`,
  `authorSubject`, `baseRevisionHash: Option`, `body`, validated frontmatter
  attributes, `status`, timestamps), the immutable `Revision` snapshot
  (append-only history: id, draftId, path, body, authorSubject,
  `parentRevision: Option`, createdAt), and the **closed** `DraftStatus` union
  (`editing | submitted | published | discarded | conflicted`) folded with
  exhaustive `match`.
- `packages/plggpress/src/Editing/usecase/editingMigrations.ts` (proposed) — the
  `drafts` / `revisions` DDL as plgg-db-migration `-- migrate:up/down` bodies,
  in a **table namespace distinct from ticket 16's derived index** (recovery
  policy). Runs through the same migrator ticket 16 uses.
- `packages/plggpress/src/Editing/usecase/draftStore.ts` (proposed) —
  `saveDraft`/`getDraft`/`listDrafts`/`submitDraft`/`discardDraft`, each
  `Db`-taking, transactional, on the typed `Result`/`PromisedResult` channel;
  every mutation appends a `Revision`. Ownership (author-subject) is enforced in
  the store seam, not only the route.
- `packages/plggpress/src/Editing/usecase/checkBase.ts` (proposed) — optimistic
  conflict detection: recompute the current source file's content hash (the same
  hash ticket 16 stores as `documents.content_hash`) and compare to the draft's
  `baseRevisionHash`; a mismatch is a typed `conflict`, never a silent
  overwrite.
- `packages/plggpress/src/Editing/usecase/publishDraft.ts` (proposed) — the
  **admin-mediated export**: re-check base (conflict → abort), validate
  frontmatter via ticket 17's `casterOf`, **path-safety check**, atomically
  write the Markdown file into `contentDir`, append a `published` revision, flip
  status, and call ticket 16's `syncDocument` to re-index. The reconciliation
  flow made concrete.
- `packages/plggpress/src/Editing/usecase/renderPreview.ts` (proposed) — parse
  the draft body with plgg-md (`parseFrontmatter` + `parseBlocks`) and render
  through the pure path; the no-raw-HTML subset is the safety boundary. Pure, no
  I/O, so it is the same function the live-preview `view` calls each keystroke.
- `packages/plgg-md/src/Frontmatter/usecase/parseFrontmatter.ts`,
  `src/Render/usecase/renderMarkdown.ts`, `src/Render/usecase/mdToHtml.ts`,
  `src/Block/usecase/parseBlocks.ts` — the pure parse+render pipeline the
  preview reuses verbatim; ticket 17 extended `parseFrontmatter` to the
  YAML-subset parser this ticket relies on for typed draft frontmatter.
  Consumed, not modified.
- `packages/plgg-view/src/Program/usecase/application.ts` — the
  `Application<Model, Msg>` seam (`init`/`update`/`view`/`onUrlChange`/`toUrl?`);
  ticket 06 adds `Cmd`/`Sub`, which the editor's autosave/submit use. The editor
  component plugs its `update`/`view` here; the scheduler (ticket 20/09) owns the
  drafts-inbox program. Consumed.
- `packages/plgg-sql/src/Db/`, `packages/plgg-sql/src/Sql/`,
  `packages/plgg-db-migration/src/testkit/migrator.ts` +
  `src/testkit/sqliteDb.ts` — the `Db` seam, the `transaction` pipeline step,
  and the migrator/harness the store + migrations ride (real `node:sqlite`).
  Consumed, not modified.
- `packages/plgg-content/src/Query/usecase/getDocument.ts`,
  `src/Ingest/usecase/syncDocument.ts` — **ticket 16's** query seam (seed a
  draft's `baseRevisionHash` from the published document's `content_hash`) and
  incremental re-index (called after a publish). Delivered by ticket 16;
  consumed, not modified.
- `packages/plggpress/src/Admin/usecase/adminDeclaration.ts`,
  `usecase/adminGuard.ts` — **ticket 20's** scheduler declaration (the drafts
  inbox is a new Resource + Actions declared alongside) and the route-seam
  authorization the editing routes extend (guest-owner / admin gating).
  Delivered by ticket 20; consumed and extended by data/role, not re-architected.
- `packages/plggpress/src/server/pressServer.ts` — **ticket 14's**
  `pressServeWeb` mount seam, where ticket 20 mounts `/admin`; the editing
  routes mount here (under the guarded subtree) **and only here** (the seam's
  stated purpose). Delivered by ticket 14, extended by 16/19/20; this ticket adds
  the guest-editable routes to the guarded sub-app.
- `packages/plgg-server/src/Routing/model/Web.ts`
  (`route(basePath, sub)`, `get`, `post`), `packages/plgg-http/src/Http/model/`
  (`Form.ts` for the submit body, `Cookie.ts`/`HttpRequest.ts` for the session
  and CSRF token, `HttpResponse.ts` `jsonResponse`) — the routing/HTTP surface
  the editing sub-app is built from. Consumed, not modified.
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` — `contentDir`
  resolution and ticket 17's `models` (used to know which `ContentModel` binds
  the target path, so publish validates against the right model). Consumed.
- `packages/guide/**/*.md` and `packages/guide/site.config.ts` — the real
  corpus and config; the reconciliation demo (Implementation Step 8) publishes a
  guest draft into a *scratch copy* of this tree and verifies the SSG picks it
  up. The static reader path stays byte-untouched until publish.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the decision
  record (D4 names this ticket); the design step writes its reconciliation
  decision into a short `.workaholic/specs/` note that either reaffirms or
  amends D4.

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143017-frontmatter-yaml-subset-and-content-models.md`
  delivers the YAML-subset `parseFrontmatter`, `foldYaml`, and the declarative
  `ContentModel`/`casterOf`/`ContentModelBinding`; this ticket validates a
  draft's frontmatter through `casterOf` at the publish boundary — its
  Considerations named exactly this hand-off: *"guest web editing of articles
  (D4) turns frontmatter into truly hostile input — re-audit the parser's
  adversarial spec table then."* This ticket **is** that re-audit.
  `.workaholic/tickets/todo/a-qmu-jp/20260704143020-admin-ui-on-scheduler.md`
  delivers the scheduler-declared admin, the `adminGuard`/`roleOf`
  authorization, the served `/admin` subtree, and the focus-managed confirm
  dialog; its Considerations state *"guests' collaborative surfaces … article
  editing/revisions (ticket 22) … land in phase 7"* and that the guard is
  modelled so *"adding a guest-visible surface is a data/role decision, not a
  re-architecture"* — this ticket is that addition.
- **Transitive foundation (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  (the `content_hash` a draft's base is seeded from, and `syncDocument` for
  post-publish re-index; its Considerations flag the D4/SQLite-primary revisit
  and to *"model `CollectionSchema` so a `visibility` field can be added"* — the
  private-draft precursor);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143014-plggpress-serve-mode-dual-config.md`
  (the `pressServeWeb` mount seam the editing routes attach to);
  `.workaholic/tickets/todo/a-qmu-jp/20260704143006-plgg-view-cmd-sub-effects.md`
  (D2 Cmd/Sub — autosave/submit as effects); and
  `.workaholic/tickets/todo/a-qmu-jp/20260704143018-account-domain-roles-and-invites.md`
  (the `Role` union and membership table the ownership/authorization decisions
  read).
- `.workaholic/tickets/archive/work-20260703-220007/20260703222255-plgg-auth-persistence-and-hardening.md`
  (story `.workaholic/stories/work-20260703-220007.md`) — the **atomic `take*`
  persistence discipline** (SELECT+DELETE in one transaction) the roadmap's
  known-constraints list mandates; the draft store's status transitions and the
  publish transaction follow the same single-transaction rule so a draft can't
  be double-published or torn under a race.
- `.workaholic/tickets/archive/work-20260630-013457/20260630013501-plgg-md-scaffold-frontmatter-block-ast.md`
  (story `.workaholic/stories/work-20260630-013457.md`) — founded plgg-md's
  `Block`/`Inline` AST and the deliberate no-raw-HTML subset that *is* this
  ticket's XSS boundary; the same parse+render path powers the live preview.
- `.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md`
  — the SSG core and `discoverPaths`/`pressRouter`; publishing writes a file the
  *next* SSG build discovers, so the reader path stays the static D5 half.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — established plggpress's
  direct-deps + `framework/` layout the `Editing/` feature lands beside;
  **D13** later re-canonicalized plggmatic in this monorepo (plggpress consumes
  it).
- **Concern 51**
  (`.workaholic/concerns/51-plggpress-exports-map-is-import-only.md`) — keep
  plggpress's export-map `types`+`default` widening intact if the barrel grows.
  **Concern**
  (`.workaholic/concerns/51-hot-reload-does-not-refresh-config.md`) — hot reload
  does not refresh `site.config.ts`; a publish that changes bound models needs a
  served-instance re-read (note in Considerations). **Sibling ticket 02**
  (`…143002-harden-coverage-gate-defaults.md`) makes the ≥90 gate load-bearing.

**Wiring note (load-bearing):** no new package — the editing feature is inside
plggpress. So **no** new `cd $REPO_ROOT/packages/<name> && npm run build` line
enters `scripts/build.sh`/`scripts/npm-install.sh` and **no** new `test-*.sh`
enters `scripts/check-all.sh`. plggpress already depends on `plgg-md`,
`plgg-view`, `plgg-sql`, `plgg-db-migration`, `plgg-content`, and `plgg-auth`
(via tickets 07/16/19), and those must build **before** plggpress; ticket 16/20
already invert the order (plgg-content/plggmatic → plggpress). This ticket's job
is to **verify** the order holds and correct it with the exact `cd`-line format
only if a predecessor left it wrong. A fresh `check-all.sh` is the arbiter.

## Implementation Steps

1. **Design step (MANDATORY — no `src/` edit before it, and this ticket is
   expected to split here).** Produce a short reconciliation-flow note under
   `.workaholic/specs/` that pins, and presents at the drive approval gate,
   **before** any code:
   - (a) **The D4 verdict.** State explicitly whether git-primary survives:
     the default is *published content git-primary; drafts/revisions DB-only
     staging; publish = export-to-git reconciliation*. If the design shows this
     is untenable (e.g. concurrent multi-guest editing needs a CRDT/merge, or
     stakeholders expect the draft to *be* the source of truth), record the case
     to **flip D4 to SQLite-primary** and amend the decision record — that is the
     trigger firing, and it re-scopes the downstream phases. Do not implement
     past this until the verdict is agreed.
   - (b) **The reconciliation flow**, step by step: open (seed base from ticket
     16's `content_hash`) → edit/autosave (append revisions) → submit (guest) →
     review + publish (admin: base re-check → validate → path-check → atomic
     file write → published revision → re-index) → conflict handling. A diagram
     or numbered sequence, with the exact failure branches.
   - (c) **The persistence placement** — the `drafts`/`revisions` table
     namespace, distinct from ticket 16's derived index, and which store owns it
     (default: a new `Editing` domain in plggpress over the same `Db`).
   - (d) **The authorization model** — guest-owner vs admin capabilities, and
     the ownership predicate.
   - (e) **The split plan** — this ticket is large; agree the sub-tickets it
     splits into (proposed: **22a** draft/revision persistence + store +
     `checkBase`; **22b** editor component + live preview; **22c** publish/
     export-to-git reconciliation + re-index). Implementation Steps 2–9 below are
     the union across the split.
2. **Migrations + models** (`Editing/model/`, `usecase/editingMigrations.ts`):
   the `DraftStatus` closed union; `Draft` and immutable `Revision` models with
   `Option`-typed base/parent and typed frontmatter attributes; the
   `drafts`/`revisions` DDL as plgg-db-migration bodies in a **distinct table
   namespace** from the derived index. Run through the migrator; errors stay on
   the typed channel.
3. **Draft store** (`Editing/usecase/draftStore.ts`): `saveDraft`, `getDraft`,
   `listDrafts` (filterable by author + status), `submitDraft`, `discardDraft` —
   each `Db`-taking, **transactional**, appending a `Revision` on every mutation,
   enforcing the **author-subject ownership** predicate in the seam (a guest
   cannot load/mutate another guest's draft). Status transitions follow a total
   `match` over `DraftStatus`; illegal transitions are typed `Err`.
4. **Base capture + conflict check** (`Editing/usecase/checkBase.ts`): when a
   draft opens against an existing page, seed `baseRevisionHash` from ticket
   16's `getDocument(...).content_hash`; `checkBase` recomputes the current
   source hash and returns a typed `clean | conflict`. A new page (no existing
   source) has `baseRevisionHash: none()` and conflicts only if a file appears
   at its path meanwhile.
5. **Publish / export-to-git** (`Editing/usecase/publishDraft.ts`,
   admin-only): fold, in **one atomic operation** — re-run `checkBase`
   (conflict → abort, mark `conflicted`, surface to the admin, **no write**);
   validate the draft's frontmatter via ticket 17's `casterOf(model)` over
   `foldYaml(data)` (invalid → typed violations, no write); **path-safety**
   (canonicalize the target path, assert it stays strictly inside `contentDir`,
   reject `..`/absolute/symlink escape); write the Markdown file **atomically**
   (temp file + rename, mirroring the atomic-dist discipline in
   `project_bundler_flake_atomic_publish`); append a `published` `Revision`;
   flip status to `published`; call ticket 16's `syncDocument` to re-index. A
   crash at any point leaves neither a half-written file nor a mis-marked draft
   (transaction + rename atomicity).
6. **Live preview + editor component** (`Editing/usecase/renderPreview.ts` +
   the editor's `update`/`view`): `renderPreview` is pure — `parseFrontmatter` +
   `parseBlocks` + render through plgg-md's no-raw-HTML path; the `view` renders
   a labelled `<textarea>` beside a preview region and re-runs `renderPreview`
   on each `Msg`. **Autosave and submit are `Cmd`s** (ticket 06): a debounced
   autosave `Cmd` persists the working body via `saveDraft`; submit is a `Cmd`
   folding to a status/toast `Msg`. Preview stays effect-free.
7. **Drafts inbox on the scheduler + guarded mount** (extend ticket 20's
   `adminDeclaration`; routes at `pressServeWeb`): declare a **Drafts Resource**
   (list + detail hosting the editor) with Actions `submit` (guest-owner),
   `publish` (admin, behind the focus-managed confirm dialog), `discard`; the
   editor detail is the one bespoke widget the scheduled detail view hosts.
   Mount the guest-editable routes on ticket 14's seam **only**, extending
   ticket 20's `adminGuard`: anonymous → login redirect; guest → own drafts
   only (create/edit/submit); admin → all drafts + publish; every state-changing
   Action verifies ticket 19's CSRF token. The SSG (`build`/`pressRouter`) render
   path stays byte-untouched.
8. **Runnable demo / real-browser drive** (proof-of-value, working-style):
   against a scratch copy of `packages/guide` served via `npx plggpress serve`,
   log in as a guest, edit a page in the textarea and watch the live preview
   track keystrokes, autosave, then submit; log in as admin, review the draft,
   attempt publish while the underlying file has been changed out-of-band
   (**conflict** surfaced, no write), resolve, publish cleanly (file written into
   the tree, re-indexed, appears in the delivery API); run a subsequent
   `plggpress build` and confirm the published page is now in the SSG output.
   Drive keyboard-only for the a11y criterion; quote the conflict + publish
   evidence in the PR.
9. **Specs** (co-located, flat `test()`, absolute imports, real `node:sqlite` +
   real temp `contentDir`): store transitions and ownership enforcement;
   `checkBase` clean/conflict (including the new-page case); `publishDraft`
   atomicity (mid-publish failure leaves no partial state), frontmatter-invalid
   abort, and the **path-traversal-rejection** table (`..`, absolute, symlink);
   `renderPreview` proves a `<script>`/raw-HTML body renders inert; the
   **authorization matrix** (anonymous / guest-owner / guest-non-owner / admin ×
   each draft/publish route → redirect/403/allow) and **CSRF-rejection** on every
   state-changing route; the editor's autosave/submit `Cmd`s asserted as inert
   data. Ticket 16's `getDocument`/`syncDocument` are stubbed at the `Db` seam so
   editing specs stay fast.
10. **House rules end to end**: no `as`/`any`/`ts-ignore`; `Option` not
    null/undefined, `Result` not throw; exhaustive `match` over `DraftStatus`,
    `Role`, conflict outcome, and publish result; data-last pipelines
    (`pipe`/`cast`/`proc`); prefer `Str`/`asStr` over `SoftStr` in new code where
    seams allow; Prettier `printWidth: 50`; **zero new dependencies**, no native
    bindings (`node:sqlite` behind plgg-sql's `Db` seam is the only DB surface;
    the atomic write uses `node:fs` stdlib); **no new package** (verify the
    runner scripts need no new `cd`-line and that plggpress's deps build before
    it — correct the order only if a predecessor left it wrong).

## Quality Gate

**Acceptance criteria**

1. **D4 verdict recorded (the revisit trigger fired):** the design note states,
   on the record, whether git-primary survives; the implemented default keeps
   **published content git-primary and rebuildable** (ticket 16's derived-index
   tables and `rebuildIndex` invariant untouched) with **drafts/revisions as a
   distinct, DB-only staging namespace**, OR the note argues and the decision
   record is amended to flip D4 — either way the decision is explicit, not
   implicit in code.
2. **Bounded-Markdown safety boundary:** live preview and published render both
   go through plgg-md's no-raw-HTML AST; a spec proves a draft body containing
   `<script>`/raw HTML renders inert (no rich-text/`contenteditable`/sanitizer
   dependency exists in the diff).
3. **Authorization + CSRF (Phase 6/7 discipline extended):** every draft/publish
   route is guarded — anonymous → login redirect; a guest reaches only **their
   own** drafts (create/edit/submit); **only admin publishes**; the boundary
   matrix (anonymous / guest-owner / guest-non-owner / admin × each route) is
   spec-asserted and every state-changing Action rejects a missing/invalid CSRF
   token. No SMTP/mailer anywhere.
4. **Optimistic conflict detection works:** a draft records its base
   (`content_hash`); on submit/publish `checkBase` detects an out-of-band change
   and **blocks the write** (typed conflict surfaced to the user), never a silent
   overwrite; a clean base publishes. The demo shows both branches.
5. **Admin-mediated export reconciles to git:** publish validates frontmatter via
   ticket 17's `casterOf`, path-safety-checks the target, writes the Markdown
   file **atomically** inside `contentDir`, appends a `published` revision, and
   re-indexes via ticket 16's `syncDocument`; the operation is **atomic and
   idempotent** (a mid-publish failure leaves no half-written file and no
   mis-marked draft); a subsequent `plggpress build` includes the published page.
6. **Path-safety enforced:** the traversal table (`..`, absolute path, symlink
   escape) is rejected before any write — a spec proves a crafted draft cannot
   write outside `contentDir`.
7. **Effects vs purity (D2):** autosave and submit are `Cmd`s (asserted as inert
   data in specs); live preview is pure (no effect on keystroke).
8. **Dual-mode intact (D5) + accessibility:** the SSG reader path is
   byte-untouched until a publish writes a file (empty `diff -r` on the
   unchanged corpus); the editor is fully keyboard-operable with a labelled
   textarea/preview and focus-managed publish confirm.
9. **No escape hatches, zero new deps, no new package, coverage:** `grep` finds
   no `as `/`any`/`ts-ignore` in new modules; no new dependency in any
   `package.json`; no new package (no new `cd`/`test-*` line) and plggpress's
   deps build before it; a fresh `check-all.sh` is green with plggpress ≥90 on
   all four metrics.

**Verification method**

Run `scripts/tsc-plgg.sh` (clean) and `./scripts/test-plggpress.sh` and paste
the gate lines (including the authorization matrix, the conflict-detection, and
the path-traversal specs). Byte-identity of the unchanged reader path:
`npx plggpress build` into two dirs on the pre-edit corpus before/after the
branch and paste the empty `diff -r`. Reconciliation drive: from a scratch copy
of `packages/guide`, `npx plggpress serve --port <p>` (ticket 14/19/20), then in
a **real browser** run Implementation Step 8's full sequence — guest edit with
live preview + autosave + submit, admin conflict-then-clean publish, the file
appearing in the tree and the delivery API, and a follow-up `plggpress build`
including the published page — pasting evidence (including the keyboard-only
pass). Then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must
not mask the plggpress↔plgg-content/plgg-md/plgg-view edges or a build-order
slip) must be green end to end.

**Gate**

The design step's D4 verdict is recorded AND all nine acceptance criteria hold
objectively AND the fresh `check-all.sh` is green AND the browser reconciliation
drive (including the conflict branch and keyboard-only operation) passes. A
draft body ever rendered as raw HTML, a write outside `contentDir`, a silent
overwrite past a stale base, a guest reaching another guest's draft or
publishing, a non-atomic publish that can strand a half-written file, a missing
authorization/CSRF/path-traversal spec, a mutated derived-index schema, an
escape hatch, a new dependency, a new package, a wrong build order, or a
coverage dip fails the ticket.

## Considerations

- **This ticket is a split point.** Per the scope it is deliberately large and
  is expected to fan into 22a (persistence + store + conflict), 22b (editor +
  preview), and 22c (publish/export reconciliation) after the design step. The
  split must be agreed at the approval gate; do not begin coding a monolith.
- **D4 flip is on the table.** The default keeps git-primary, but if the design
  reveals that guest editing genuinely needs SQLite-primary (concurrent editing,
  merge, draft-as-truth), amending D4 is *in-scope for the design step* and
  re-scopes phases 5–8 (the derived index would gain an authored tier). Record
  the trigger and stop for agreement rather than quietly building either way.
- **Git commit/push is deferred to ticket 28.** This ticket writes the published
  Markdown file into the working tree and re-indexes; *committing* it to git
  (and any push/PR automation) is a production-operations concern. Until then the
  written file is a working-tree change an operator commits — state this in the
  publish usecase docstring so it is not mistaken for a full git integration.
- **Served-instance config re-read.** Publishing can change which files exist
  under a bound model; the served instance built its index/schemas at boot
  (ticket 16) and hot reload does not refresh `site.config.ts` (concern
  `51-hot-reload-does-not-refresh-config`). `syncDocument` covers the content
  row, but a *new* collection binding needs a re-read — note the boundary; a
  watcher/reload is ticket 28's, not this ticket's.
- **Private/unpublished visibility.** Drafts are visible only to their author and
  admins; ticket 16 already suggested modelling `CollectionSchema` with a future
  `visibility` field. If a future requirement wants *published-but-private*
  collections, that is a ticket-16 delivery-API extension (per-collection
  visibility at the `/api` guard), not an editing concern — do not half-build
  ACLs here.
- **Concurrent edits within a single draft** are out of scope: the optimistic
  base check guards a draft against the *published source* changing underneath,
  not two guests editing the *same draft* simultaneously. If co-editing a single
  draft is later wanted, that is the strongest D4-flip pressure (CRDT/merge) —
  record it as the revisit trigger for a future ticket rather than bolting on
  last-write-wins.
- **Media in drafts belongs to ticket 23.** A draft may reference an image path,
  but uploading the asset is ticket 23; keep `publishDraft` agnostic to assets
  (it writes Markdown text only) so ticket 23 layers asset handling without
  reshaping the publish flow.
