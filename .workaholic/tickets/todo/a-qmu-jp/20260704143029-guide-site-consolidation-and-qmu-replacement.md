---
created_at: 2026-07-04T14:30:29+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, UX]
effort:
commit_hash:
category:
depends_on: [20260704143007-plggpress-theme-on-plggmatic.md, 20260704143016-plggpress-content-index-and-delivery-api.md, 20260704143028-production-topology-and-operations.md]
---

# Rollout consolidation: progressively light up the guide's served features, settle `packages/site`'s fate, and assess the qmu.co.jp replacement into its own ticket series

## Overview

Phase 11 (Rollout), ticket **29** — the roadmap's closing move. The
served instance is deployed and correct (ticket 28), the delivery API and
its FTS5 search endpoint exist (ticket 16), and the guide already renders
on the plggmatic theme (ticket 07). This ticket does **not** build a new
capability; it **rolls what exists into production** along three
independent tracks and produces the assessment that seeds the qmu.co.jp
work. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

The governing decision is **D5**, transcribed so an implementer need not
open the spec: *"Production topology — **Dual-mode**: public reader stays
SSG/CDN (GitHub Pages); dynamic features (/admin, API, RAG, agent) run as a
separate always-on served instance sharing one config."* The consequence
this ticket cashes in: the guide's **readers keep the static site**
(`https://plgg.qmu.co.jp/`, GitHub Pages, no origin server in the request
path), and **search — later the voice agent — is a progressive
enhancement** that the static pages reach on the separate served origin,
degrading to today's static experience when that origin is absent. That
degradation is not a nicety but the same posture **D11** already mandates
for the feature itself: *"always-on baseline = SQLite FTS5 (BM25) … Graceful
degradation without an API key."* A reader with JavaScript disabled, or
when the served instance is down, sees exactly the site they see today.

The third track is scoped forward-looking by **D17**, transcribed:
*"plggpress exports a Claude Code plugin: auto-generated plugin (marketplace
manifest + .mcp.json pointing at the instance's MCP endpoint + skills
generated from content structure). Long-term this replaces the workaholic
plugin once qmu.co.jp runs on plggpress."* qmu.co.jp is today an Astro site
outside this monorepo; replacing it with a plggpress instance is a large
program, and the spec deliberately files it under *Deliberately deferred*:
*"qmu.co.jp content migration mechanics (Astro → plggpress) — assessed in
ticket 29 before its own ticket series."* So this ticket's qmu.co.jp
deliverable is an **assessment document plus a follow-up ticket series** —
**not** a port. It inventories the Astro content, maps the Terraform-managed
DNS touchpoints in the corporate repo, and writes the feature-parity
checklist (including the D17 plugin superseding workaholic), then emits the
tickets that will do the migration.

The three tracks, restated:

1. **Guide progressive search (implement).** A client-side search widget on
   the static guide pages queries the served instance's `GET /api/search`
   (ticket 16), rendered as unobtrusive enhancement: absent JS or absent
   origin ⇒ the static site is unchanged. The reader delivery path stays
   SSG/CDN; only the search box talks to the origin.
2. **`packages/site` fate (decide + execute).** `packages/site` is
   plggmatic's design-system docs (component gallery, color-scheme,
   pane-alignment, workbench pages) built by plggpress but **not deployed
   anywhere today** (no `deployments/site.md`, no `deploy-site.yml`; it is
   built only inside `check-all.sh`). This ticket decides — and carries out —
   whether it deploys standalone or folds into the guide as a "Design
   system" section.
3. **qmu.co.jp replacement (assess → ticket series).** An assessment spec +
   a set of new todo tickets covering the Astro content-porting scope, the
   corporate-repo Terraform DNS touchpoints, and the feature-parity checklist
   with the D17 Claude-Code-plugin-replaces-workaholic milestone. No
   qmu.co.jp code is ported here.

The Phase 11 gate from the spec applies: *"production URLs, DNS,
backup/restore drill verified."* Track 1 must be verified against the real
deployed served origin (ticket 28); the reader SSG output stays
byte-identical where search is a pure enhancement layer.

## Policies

- `workaholic:operation` / `policies/delivery.md` — this ticket is the
  roadmap's delivery capstone: it operates the **two delivery paths** D5
  splits (static Pages reader + always-on served origin) as one product. The
  policy documents that the guide ships **post-merge on its own cadence**
  via `.github/workflows/deploy-guide.yml`, which *runs `./scripts/build.sh`*
  (the canonical dependency-ordered build — "the workflow holds no copy of
  the topology") then `npx plggpress build` in `packages/guide`, and that
  `scripts/build.sh` is **publish-order authority** (publish order is
  sed-derived from its `cd`-lines). Any change to what builds — folding
  `site` into the guide, or removing its `cd`-lines — must use the exact
  `cd $REPO_ROOT/packages/<name> && npm run build` line format and stay
  consistent across `build.sh` / `npm-install.sh` / `check-all.sh`.
- `workaholic:operation` / `policies/recovery.md` — the qmu.co.jp
  replacement is a **cutover and a DNS migration**, the highest-risk kind of
  operation the recovery policy contemplates. The policy records that the
  repo's authoritative source of truth is git and that **no rollback
  procedure is documented**; the assessment this ticket produces must
  therefore specify a reversible cutover — DNS flip with a documented
  rollback, HTTPS-enforcement re-enable, and a backup/restore drill for the
  served instance's derived SQLite index (D4: losing it costs one rebuild) —
  as first-class deliverables, mirroring the plgg.qmu.co.jp cutover contract
  already recorded in `.workaholic/deployments/guide.md`.
- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records i18n and accessibility testing as "not observed / not applicable
  (no UI components)", which predates the docs sites entirely. Track 1 adds
  the **first interactive UI surface** the public reader touches, so it must
  hold the progressive-enhancement line the policy's spirit implies: the
  search widget is keyboard-operable, announces results to assistive tech,
  and — critically — is **additive**, so no-JS and origin-down readers keep a
  fully functional static site. This is also where the qmu.co.jp assessment
  must flag i18n (the `_ja.md` counterpart rule the spec calls stale) as an
  explicit checklist item rather than an afterthought.

## Key Files

- `packages/guide/` — the plgg docs SSG consumer (`site.config.ts`,
  `index.md`, `concepts/`, `contributing/`, `packages/`); `npm run build`
  = `plggpress build --config site.config.ts --contentDir . --outDir dist`.
  The reader surface that gains the search enhancement while staying static.
- `packages/site/` — plggmatic's design-system docs (`site.config.ts`,
  `color-scheme.md`, `pane-alignment.md`, `workbench.md`, `components/`,
  `examples/`), built by plggpress + plggmatic; the package whose deploy
  fate this ticket settles. Note it clones the guide's `site.config.ts`
  shape (its header comment says "cloned from the plgg guide's shape") —
  the drift argument for folding it in.
- `packages/plggpress/src/theme/` — where a reusable **search widget**
  component lives if the enhancement is theme-owned (beside `navBar.ts`,
  `page.ts`); the widget is inert markup + a small progressive-enhancement
  script that `fetch`es the configured search origin. The SSG injection
  point mirrors the appearance-script seam ticket 07 rewired
  (`pressRouter.ts` ~line 176, `Press/usecase/appSpecs.ts` ~line 42).
- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts` — the config
  seam; a new **Option-typed** `search`/`servedOrigin` field (absent ⇒
  widget omitted, so existing configs keep loading and the SSG stays
  byte-identical when unset) is the one place the reader learns the served
  origin. Owned by plggpress; `defineSite` caster extended, never bypassed.
- `packages/plggpress/src/DeliveryApi/usecase/deliveryApi.ts` (ticket 16) —
  the `GET /api/search` sub-app the widget calls; consumed, not modified
  here. Cross-origin reachability (reader origin → served origin) is a
  **ticket 28 topology decision** (CORS header vs same-origin reverse proxy);
  this ticket consumes whatever origin ticket 28 publishes.
- `.github/workflows/deploy-guide.yml` — the post-merge Pages deploy
  (`build` job runs `./scripts/build.sh` then `plggpress build` in
  `packages/guide`); edited only if `site` folds into the guide (one build)
  or gains its own `deploy-site.yml` (standalone).
- `.workaholic/deployments/guide.md` — the deployment contract (canonical
  `https://plgg.qmu.co.jp/`, dev tunnel `https://plgg-guide.qmu.dev` →
  `:5181` via cloudflared, DNS Terraform-managed in the corporate repo
  `infra/terraform/cloudflare-dns/`); gains the served-instance surface and,
  if applicable, the site surface. A `deployments/site.md` is **new** if
  site deploys standalone.
- `scripts/build.sh` (site at line 72, `cd $REPO_ROOT/packages/site && npm
  run build` + the example-copy lines 74–76), `scripts/npm-install.sh`
  (site line 30), `scripts/check-all.sh` (`./scripts/test-site.sh` line 48)
  — the three provisioning lists that change together if `site` is retired
  or merged; `scripts/gate-guide-deps.sh` keeps them reconciled.
- `workloads/guide/` (`compose.yaml`, `dev-entrypoint.sh`,
  `scripts/serve-guide.sh`) — the dev tunnel container; the served-instance
  production analogue is ticket 28's, referenced not rebuilt here.
- **Corporate repo (external, read-for-assessment):**
  `infra/terraform/cloudflare-dns/` — the Terraform module that manages
  `plgg.qmu.co.jp` (record `proxied=false`) and would manage the qmu.co.jp
  records the assessment maps. Not editable from this repo; the assessment
  enumerates the exact records and the flip/rollback order.
- **qmu.co.jp Astro repo (external, read-for-assessment):** sibling path
  `../qmu-co-jp` (outside this monorepo — a separate git repo, not a
  `packages/` member here). The Astro app is `../qmu-co-jp/packages/astro/`
  (`astro.config.mjs`); the prose corpus is **75 `.md` files** at repo-root
  `../qmu-co-jp/docs/` (sections `about`, `service`, `policies`, and the
  設計/`design`, 実装/`implementation`, 運用/`operations`, `development`,
  `planning`, `safety` trees), loaded by
  `../qmu-co-jp/packages/astro/src/content.config.ts` (an `astro:content`
  `glob` collection, `base: "../../docs"`) and rendered through
  `src/pages/[...slug].astro`. Bespoke non-collection routes:
  `src/pages/index.astro` (hero + features home), `src/pages/contact.astro`,
  `src/pages/404.astro`. Interactive React islands (the "interactive bits"
  step 5(a) must map to plgg-view/plggmatic) live in
  `src/components/react/`: `ContactForm.tsx`, `Toc.tsx`, `SidebarTree.tsx`,
  `MobileBar.tsx`, `ThemeToggle.tsx`; a server contact endpoint
  (`src/pages/api/contact.ts` + `src/server/contact/`: `handler.ts`,
  `mail.ts`, `rate-limit.ts`, `turnstile.ts`, `validation.ts`) is a served
  feature to place. **No `_ja` counterpart files exist** (the corpus is
  single-language today) — first-hand evidence for the stale-`_ja.md` /
  i18n checklist item. Not editable from this repo; the assessment
  inventories it, ports nothing.
- **workaholic plugin (external, read-for-assessment):** sibling path
  `../workaholic/plugins/workaholic/` — the actual Claude Code plugin this
  repo dogfoods (there is **no `.workaholic/skills/` directory in this
  repo**; `.workaholic/` here holds tickets/specs/deployments/etc., not the
  plugin). This is the concrete surface D17's generated plugin must reach
  parity with. It carries `.claude-plugin/plugin.json` (the marketplace
  manifest D17 names), `commands/` (9: `carry`, `catch`, `commit`, `drive`,
  `explain`, `report`, `ship`, `ticket`, `trip`), `skills/` (22:
  `branching`, `carry`, `catch`, `check-deps`, `commit`, `create-ticket`,
  `design`, `discover`, `drive`, `explain`, `gather`, `implementation`,
  `okf`, `operation`, `planning`, `report`, `review-sections`, `ship`,
  `system-safety`, `trip-protocol`, `validate-writer-output`,
  `write-release-note`), `hooks/` (`hooks.json` +
  `guard-git-branch.sh`, `guard-git-commit.sh`, `guard-ticket-structure.sh`,
  `validate-ticket.sh`, `policy-lens.sh`, `layout-doctor.sh`,
  `posix-lint.sh`, `install-git-hooks.sh`), and `agents/` (Agent Teams:
  `architect.md`, `constructor.md`, `planner.md`). The parity checklist
  enumerates these four component kinds. Not editable from this repo.

## Related History

- **Direct dependencies (this branch):**
  `.workaholic/tickets/todo/a-qmu-jp/20260704143007-plggpress-theme-on-plggmatic.md`
  put the guide on the plggmatic theme/tokens — the visual substrate the
  search widget and any qmu.co.jp design-system parity build on.
  `.workaholic/tickets/todo/a-qmu-jp/20260704143016-plggpress-content-index-and-delivery-api.md`
  delivered `GET /api/search` (bm25 over the real guide corpus) and the
  HTTP-free query functions — track 1 is its first public consumer, and its
  own Considerations flag richer filtering "note it in ticket 20/29 if the
  admin UI needs it".
  `.workaholic/tickets/todo/a-qmu-jp/20260704143028-production-topology-and-operations.md`
  stands up the deployed served origin, the CORS/reverse-proxy topology, and
  the backup/restore drill this ticket verifies against and the assessment
  reuses as its cutover template.
- `.workaholic/deployments/guide.md` and **concern 52**
  (`.workaholic/concerns/52-https-enforcement-and-proxied-mode-follow.md`)
  — the plgg.qmu.co.jp cutover is the working template for a qmu.co.jp DNS
  flip: DNS Terraform-managed in the corporate repo, HTTPS enforcement
  re-enabled *after* the certificate issues (`gh api -X PUT
  repos/qmu/plgg/pages -F https_enforced=true`), and the degraded window
  between CNAME flip and cert provisioning (concern 52) that the assessment
  must plan around.
- `.workaholic/tickets/archive/work-20260703-020116/` (story
  `.workaholic/stories/work-20260703-020116.md`) and the PR #52 confirmation
  in `deployments/guide.md` — the custom-domain deploy that proved the exact
  build-list-order hazard (`plgg-cli plggmatic` before `plggpress`) this
  ticket must respect whenever it touches `build.sh` / `deploy-guide.yml`.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  — established plggpress as the single docs engine both `guide` and `site`
  consume; the site-fate decision leans on that (one engine, two configs
  cloned — the drift the merge option removes).
- **Concern 51**
  (`.workaholic/concerns/51-hot-reload-does-not-refresh-config.md`) — the
  served instance's config-reload behavior the operations track must not
  regress; and
  `.workaholic/concerns/51-plggpress-exports-map-is-import-only.md` — the
  export-map lesson any plugin-export follow-up ticket inherits.
- `../workaholic/plugins/workaholic/` (the sibling-repo Claude Code plugin
  this repo dogfoods — **not** `.workaholic/skills/`, which does not exist
  here) — the concrete artifact D17's Claude Code plugin export is slated to
  replace once qmu.co.jp runs on plggpress. Its surface is four component
  kinds: `commands/` (9), `skills/` (22), `hooks/` (guard/validate/lint
  scripts + `hooks.json`), and `agents/` (`architect`/`constructor`/
  `planner`), plus the `.claude-plugin/plugin.json` marketplace manifest —
  see Key Files for the full enumeration. The assessment's parity checklist
  enumerates each so the generated plugin (D17: manifest + `.mcp.json` +
  content-derived skills) can eventually cover them.

## Implementation Steps

1. **Track 1 — the config seam.** In
   `packages/plggpress/src/SiteConfig/model/SiteConfig.ts`, add an
   **Option-typed** `search` section (at minimum a `servedOrigin`
   `SoftStr`/`Str`, plus an on/off intent) and extend the `defineSite`
   caster to validate it — **absent field must remain valid** so every
   existing `site.config.ts` keeps loading and the SSG output is unchanged
   when it is unset. Prefer `Str`/`asStr` over `SoftStr` for the new field.
   Do not reach for `process.env` inside the type; the origin is authored in
   config (like `base` today) so `build` and `serve` share it.
2. **Track 1 — the widget.** Add a theme-owned search component under
   `packages/plggpress/src/theme/` (e.g. `searchBox.ts`, with a sibling
   spec): inert, keyboard-operable markup rendered into the shell only when
   `config.search` is present, plus a small body script that, on input,
   `fetch`es `<servedOrigin>/api/search?q=…&limit=…` and renders the
   `{ contents, … }` hits (ticket 16's shape) into an ARIA-announced results
   list. The script composes the origin from config — never a re-typed
   literal — and must **swallow network/parse errors silently** (origin
   down ⇒ no widget breakage, matching D11 degradation). It rides the same
   SSR-escaper survival contract ticket 07 spec-asserts (no `<`/`>`/`&` in
   composed CSS; the script is injected after the escaper like the appearance
   script). Wire injection at the two seams ticket 07 already uses
   (`pressRouter.ts`, `Press/usecase/appSpecs.ts`).
3. **Track 1 — verify against the real origin.** With the ticket-28 served
   instance running, set the guide's `search.servedOrigin` to it, rebuild the
   guide SSG, and confirm: (a) with the origin up, a query returns bm25 hits
   from the real guide corpus; (b) with the origin unreachable, the page is
   fully usable and the widget fails closed; (c) with `search` unset, the SSG
   output is **byte-identical** to today (`diff -r` empty). Record the
   cross-origin mechanism ticket 28 chose (CORS header vs same-origin proxy)
   in a one-line note — this ticket consumes it, it does not invent it.
4. **Track 2 — decide and execute `packages/site`'s fate.** Default
   (recommended, proceed unless the evidence below flips it): **fold `site`
   into the guide** as a "Design system" sidebar section under the one
   served instance and the one Pages deploy, retiring the separate `site`
   build — this kills the cloned-`site.config.ts` drift and gives the
   design-system docs the same search/served features for free. Execute by
   moving `packages/site`'s content pages under the guide's content tree,
   merging its sidebar section into `packages/guide/site.config.ts`, folding
   the `plggmatic-example` workbench-copy step (build.sh lines 74–76) into the
   guide build, and **removing `site`'s `cd`-lines** from `scripts/build.sh`
   (line 72 + the example-copy block), `scripts/npm-install.sh` (line 30),
   and `scripts/check-all.sh` (`./scripts/test-site.sh`, line 48) in the exact
   line format — then delete `packages/site` and `scripts/test-site.sh`.
   **Fallback** (take only if the design-system audience is judged distinct
   enough to warrant a separate URL): keep `packages/site` and add a
   `deploy-site.yml` + `.workaholic/deployments/site.md` + a corporate-repo
   DNS record request, mirroring the guide's contract. Record which path was
   taken and the one-sentence reason (working-style: decide explicitly, don't
   half-adopt).
5. **Track 3 — the qmu.co.jp assessment (no port).** Write an assessment
   spec (e.g. `.workaholic/specs/<date>-qmu-replacement-assessment.md`)
   covering, concretely: (a) **Astro content inventory & porting scope** —
   the qmu.co.jp Astro repo is the **sibling path `../qmu-co-jp`** (a
   separate git repo outside this monorepo; the Astro app is
   `../qmu-co-jp/packages/astro/`). Enumerate its surface (see Key Files for
   the concrete file list): the prose corpus is 75 `.md` files at
   `../qmu-co-jp/docs/` loaded by `packages/astro/src/content.config.ts`'s
   `glob` collection (`base: "../../docs"`) and rendered via
   `src/pages/[...slug].astro`; the bespoke `.astro` routes
   (`src/pages/index.astro` home, `contact.astro`, `404.astro`); and the
   interactive React islands in `src/components/react/` (`ContactForm.tsx`,
   `Toc.tsx`, `SidebarTree.tsx`, `MobileBar.tsx`, `ThemeToggle.tsx`) plus the
   `src/pages/api/contact.ts` + `src/server/contact/` server endpoint. Map
   each to a plggpress target (Markdown + ticket-17 content models for the
   `docs/` prose; plgg-view / plggmatic components for the interactive
   islands; a served-instance route for the contact endpoint; the design
   system from plggmatic tokens for visual parity). (b) **Terraform DNS
   touchpoints** — the
   exact records in the corporate `infra/terraform/cloudflare-dns/` module,
   the flip order, HTTPS-enforcement re-enable, and the degraded window
   (concern 52), written as a reversible cutover with a rollback like the
   plgg.qmu.co.jp precedent; (c) **feature-parity checklist** — auth (D6),
   content models (D8), delivery API (**ticket 16** — the
   `packages/plggpress/src/DeliveryApi/` MicroCMS-like API; it has **no
   D-number**. Do not label it D16: D16 is the unrelated `--vp-*`→`--pm-*`
   token-variable migration), RAG/search (D11), voice agent (D12), and the
   **D17 Claude Code plugin export replacing the workaholic plugin** as a
   named milestone whose parity target is the sibling-repo surface at
   `../workaholic/plugins/workaholic/` (its `commands/`, `skills/`, `hooks/`,
   and `agents/` — see Key Files; **not** a nonexistent `.workaholic/skills/`
   in this repo), plus i18n (the stale `_ja.md` rule — no `_ja` files exist
   in `../qmu-co-jp/docs/` today) as an explicit item. Then emit
   the **follow-up ticket series** into `.workaholic/tickets/todo/` (one
   ticket per coherent chunk: content-port, design-system-parity, DNS/cutover,
   plugin-export-cutover), each frontmatter-valid and `depends_on`-linked back
   to the delivered roadmap tickets and to this one. This ticket writes the
   plan and the tickets; it ports **no** qmu.co.jp content.
6. **Update the deployment contract.**
   `.workaholic/deployments/guide.md`: add the served-instance surface (its
   production URL from ticket 28, the search enhancement, the backup/restore
   drill reference) to the surfaces table and confirmations; add
   `deployments/site.md` only if track 2 took the standalone fallback. Keep
   the DNS/HTTPS notes accurate (Terraform-managed, corporate repo).
7. **House rules throughout:** no `as`/`any`/`ts-ignore`; `Option`/`Result`
   + exhaustive `match` (`plgg-coding-style`); prefer `Str`/`asStr` over
   `SoftStr` in new config fields; Prettier `printWidth: 50` per package;
   **zero new external dependencies** and no native bindings (the widget
   script is hand-rolled `fetch`, no client framework); coverage stays >90
   on every touched package.

## Quality Gate

**Acceptance criteria**

1. **Progressive search works and fails closed (D5 + D11):** with the
   ticket-28 served origin configured and up, the static guide's widget
   returns bm25 hits from the real guide corpus; with the origin unreachable
   or JS disabled, the page is fully functional and the widget is inert; with
   `config.search` unset, the built guide SSG is **byte-identical** to
   pre-branch (`diff -r` empty). The reader delivery path remains SSG/CDN —
   no origin server enters the static request path.
2. **Config seam is additive:** the new `SiteConfig.search` field is
   Option-typed, validated through `defineSite`, and its absence keeps every
   existing `site.config.ts` loading; the served origin is authored in
   config, shared by `build` and `serve`, never a re-typed literal in the
   body script.
3. **`site` fate decided and executed cleanly:** exactly one of {folded into
   the guide, deployed standalone} is realized, with the reason recorded; if
   folded, `packages/site` and `scripts/test-site.sh` are gone and their
   `cd`-lines are removed from `build.sh`/`npm-install.sh`/`check-all.sh` in
   exact format with `gate-guide-deps.sh` still green; if standalone,
   `deploy-site.yml` + `deployments/site.md` exist and the DNS request is
   recorded. No half-merged state.
4. **qmu.co.jp assessment + ticket series exist (no port):** the assessment
   spec covers Astro-porting scope, the corporate-repo Terraform DNS
   touchpoints with a reversible cutover/rollback (HTTPS re-enable, degraded
   window per concern 52), and the feature-parity checklist including D17's
   plugin-replaces-workaholic milestone and i18n; the emitted follow-up
   tickets are frontmatter-valid and `depends_on`-linked. **No qmu.co.jp
   content is ported in this branch.**
5. **Deployment contract current:** `.workaholic/deployments/guide.md`
   reflects the served-instance surface and the search enhancement; DNS/HTTPS
   notes stay accurate.
6. **House rules held:** no `as`/`any`/`ts-ignore`; no new external
   dependency in any `package.json`; touched packages stay >90 across
   statements/branches/functions/lines.

**Verification method**

Run `scripts/tsc-plgg.sh` (where applicable) and
`./scripts/test-plggpress.sh` green, then a **fresh** `scripts/check-all.sh`
(clean rebuild — stale dists must not mask the site-fate build-list change or
the SiteConfig edit; it runs `gate-guide-deps.sh` and every package suite)
green end-to-end. Byte-identity: `cd packages/guide && npx plggpress build
--outDir <scratch>/before` on the pre-change tree with `search` unset, same
to `<scratch>/after` on this branch, and paste the empty `diff -r`. Search
smoke: with the ticket-28 served origin reachable, build the guide with
`search.servedOrigin` set, serve `dist/`, and paste a query's returned hits;
then point the origin at a dead port and show the page still renders and the
widget no-ops. Validate the emitted follow-up tickets through the
ticket-lint hook (frontmatter fields present, `depends_on` bare-unquoted).
For the standalone-site fallback, show `deploy-site.yml` builds the site
dist; for the fold, paste `git diff --stat` showing `packages/site` removed
and the three provisioning lists updated.

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. A non-empty SSG diff with `search` unset, a widget that breaks
the page when the origin is down, a required-not-optional `search` field, a
half-merged `site` state, any qmu.co.jp content ported here, an invalid
emitted ticket, an escape hatch (`as`/`any`/`ts-ignore`), a new external
dependency, or a coverage dip fails the ticket.

## Considerations

- **Cross-origin is ticket 28's call, consumed here.** If ticket 28 fronts
  the served instance under the same origin as the Pages reader (reverse
  proxy at a path), the widget needs no CORS and the fetch is same-origin;
  if it stays a distinct origin, ticket 28 owns the CORS allow-list for the
  reader origin. This ticket must not add CORS handling to the delivery API
  (that would fork ticket 16/28's boundary) — it reads whatever origin
  policy is published and configures the widget accordingly. Revisit trigger:
  if the widget needs a header the served instance does not send, the fix
  lands in ticket 28's topology, not here.
- **The voice agent is deliberately out of track 1.** D5 lists the agent as
  a served feature and the scope says "later agent"; ticket 25 owns lighting
  it up on the guide. The widget seam (config-driven, progressive, fails
  closed) is built so the agent enhancement reuses the same pattern — note it
  as the reuse point when ticket 25 rolls out.
- **`site` merge vs standalone is a reversible decision.** Folding is the
  default because two cloned `site.config.ts` files are a standing drift
  source (the absorb-plggmatic story already consolidated the engine); but if
  the design-system docs later earn a distinct brand/audience/URL, splitting
  back out is cheap (re-add the package + a `deploy-site.yml`). Whichever way
  it goes, the deciding sentence must be in the PR so a future reader knows it
  was chosen, not defaulted-into blindly.
- **qmu.co.jp is a program, not a ticket.** Keeping track 3 an
  assessment-plus-tickets (per the spec's deferral) is load-bearing: the DNS
  cutover touches the **corporate** Terraform repo (not writable from here),
  the content volume is large, and the D17 plugin export (ticket 30) must
  land before the plugin can replace workaholic. The assessment sequences
  these; do not let "while we're here" pull any qmu.co.jp port into this
  branch.
- **The workaholic replacement is the long pole.** D17's plugin export
  superseding the workaholic plugin only completes "once qmu.co.jp runs on
  plggpress"; the assessment should state plainly that workaholic keeps
  driving this repo's workflow until that milestone, so no one retires it
  early. The generated plugin's parity with the real workaholic plugin at
  `../workaholic/plugins/workaholic/` (its `commands/`, `skills/`, `hooks/`,
  and `agents/` — not a `.workaholic/skills/` path, which does not exist in
  this repo) is a checklist item, not an assumption.
- **i18n resurfaces here.** The spec treats the `_ja.md` counterpart rule as
  stale, but qmu.co.jp is a bilingual public site; the assessment must decide
  whether the replacement carries i18n content modeling (a D8 content-model
  extension) rather than inheriting the docs sites' English-primary posture
  by accident.
- **Degraded-window discipline.** Any DNS flip the assessment plans inherits
  concern 52's lesson: the window between CNAME flip and certificate
  provisioning is user-visible; plan the flip, the HTTPS-enforcement
  re-enable, and the rollback as an ordered, reversible runbook, exactly as
  `deployments/guide.md` records for plgg.qmu.co.jp.
