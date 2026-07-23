# plggpress / plggmatic Long-Range Roadmap and Decision Record

Date: 2026-07-04
Author: a@qmu.jp (decisions), recorded by Claude Code
Status: Approved — all D-decisions confirmed interactively by the author on 2026-07-04.

This document is the single reference for the plggpress-as-CMS /
plggmatic-as-framework roadmap. Every roadmap ticket in
`.workaholic/tickets/todo/a-qmu-jp/` links back here. When a ticket and this
document disagree, this document wins until amended.

## Vision (author's words, condensed)

- **plggpress** is a CMS built on the **plggmatic** framework. The plgg
  documentation site is produced by plggpress.
- plggpress keeps its Markdown→docs-site capability, and adds: sign-in via
  plgg-auth (admin publishers AND invited "collaborative guest" project
  stakeholders); automatic SQLite-based RAG indexing of all content
  (embeddings are opt-in, activated by configuring an LLM API key); a
  conversational browser agent using the OpenAI Realtime API (user speaks →
  agent searches the RAG DB → answers), so stakeholder interactions
  accumulate inside plggpress; a native MCP server; a MicroCMS-like delivery
  API enabling SPA consumers; typed custom content models (user-defined
  attributes); **and Claude Code plugin export** — a plggpress instance can
  auto-generate an installable Claude Code plugin (and/or expose its MCP
  server) so a team's stored knowledge is referenceable from Claude Code.
  When qmu.co.jp is implemented on plggpress, this feature replaces the
  workaholic plugin.
- All of this while pursuing a *minimal, zero-dependency* CMS identity.
- **plggmatic** is both a framework and a design system. Its essence is not
  the multi-column UI (that is one display mode) but declarative definition
  of menus, data lists/details, actions (create/update/delete), search, and
  flows, from which the UI is automatically "scheduled". Two screen modes:
  (1) multi-column panes expanding rightward, (2) conventional single-column
  one-operation-per-screen. The first design system follows the current plgg
  docs site and qmu.co.jp: minimum 5-color scheme (primary + success/danger/
  warning/info; 7-color adds secondary/tertiary), default primary black/white,
  valid in both dark and light modes.
- First goal: rewrite plggpress on plggmatic, extend plggpress, build the
  plgg documentation with it. Eventually qmu.co.jp is replaced by plggpress
  with the design system propagating from plggmatic.
- **Sacrificial architecture (positioning pillar).** In the LLM/"vibe-coding"
  era, application code becomes cheap and disposable — expect on-demand-
  generated apps, and yearly or monthly full-scratch rewrites. plggmatic
  ("Prag") stands for the demand to build once and then freely redesign the
  *system* later while sustaining persistency: the database, object-storage
  files, and domain models. The framework therefore treats the **application
  shell as sacrificial** and the **data + domain model + external contracts as
  the durable core**, and makes that boundary crisp and machine-checkable.
  plgg's strict, no-escape-hatch, type-driven style is precisely what makes
  machine-regenerated shells trustworthy — `tsc` and casters catch the
  regenerator's mistakes before users do.

## Decisions (all confirmed 2026-07-04)

| # | Decision | Choice |
|---|---|---|
| D1 | Home of the declarative UI scheduler | **plggmatic** (= design system + UI scheduling framework); plggpress is its CMS consumer. The absorbed facade in `plggpress/src/framework` is kept for build/CLI and re-layered gradually. |
| D2 | Effects for plgg-view's TEA runtime | **Add Cmd/Sub to plgg-view itself** — `update: (msg, model) => [Model, Cmd<Msg>]` plus subscriptions. Breaking change, accepted (breaking-changes-OK policy). Lands before/with the action abstraction. |
| D3 | Sequencing of goal #1 | **Theme rewrite first**: tokens → port plggpress theme onto plggmatic → prove on the live guide; scheduler afterwards. |
| D4 | Content source of truth | **Git/filesystem primary, SQLite is a derived, rebuildable index.** RAG, search, requests/comments live DB-only. Revisit SQLite-primary only when guest web editing of articles ships. Reframed under D18 as the flagship instance of the durable-core / sacrificial-shell boundary: git-primary content is the durable core, the SQLite index is sacrificial (rebuildable output). |
| D5 | Production topology | **Dual-mode**: public reader stays SSG/CDN (GitHub Pages); dynamic features (/admin, API, RAG, agent) run as a separate always-on served instance sharing one config. |
| D6 | Auth topology | **plggpress consumes plgg-auth as a real OIDC OP (self-hosted IdP, OP+RP dogfooding).** Chosen over a lighter session layer. This makes MCP-over-HTTP authorization and API-token issuance standard OAuth flows. |
| D7 | Accounts/roles/invites | **New account domain above plgg-auth** (exact package placement decided in its design ticket); roles as an app-side **membership table** keyed by Subject (instantly revocable); invites as **copy-paste links** generated in the admin UI — no SMTP. |
| D8 | Custom content models | **Both layers, one truth**: YAML-subset frontmatter parser built on plgg-parser, validated against caster-backed content-model types declared in config. |
| D9 | Color tokens | **Monochrome (black/white primary) default + role×variant matrix + 5 colors now.** Matrix = {primary, success, danger, warning, info} × {base, text, surface, border}. Palette-override API added. secondary/tertiary added only when a consumer earns them (type design leaves room). |
| D10 | Screen modes | **Runtime-switchable**: the declaration format is mode-agnostic from day one; the single-column renderer may ship later, but the vocabulary never encodes a mode. |
| D11 | RAG substrate | **Zero-dependency purism**: always-on baseline = SQLite FTS5 (BM25); opt-in embeddings = BLOB Float32 + JS cosine top-k. No sqlite-vec/native extensions. Graceful degradation without an API key. |
| D12 | LLM seam & Realtime | **plgg-kit is the single active vendor seam** (settles retired-vs-live ambiguity: it is LIVE). Add embeddings/streaming/ephemeral-key minting there; plgg-fetch gains streaming+cancellation underneath. Realtime agent = **browser connects directly to OpenAI** with server-minted ephemeral keys; the server also exposes the RAG tool-call endpoint. Vendor kept swappable behind the seam. |
| D13 | plggmatic canonical home | **This monorepo.** Fix repository/homepage manifest fields and the stale "now developed in its own repository" prose. |
| D14 | Coverage gating | **New packages gated ≥90 from day one**; fix the silent-ungating default (missing plgg-test.config.json must not silently skip gating); gate plgg-kit. |
| D15 | MCP implementation | **Hand-rolled** (JSON-RPC 2.0 on node stdlib) per vendor-neutrality. stdio transport + read-only tools first; streamable HTTP + OAuth (via our own OP, D6) second. |
| D16 | --vp-* migration | **Clean cutover to --pm-\*** (breaking-changes-OK), except the theme-persistence localStorage key `vp-appearance` is preserved so visitors' theme choices survive. |
| D17 | Claude Code integration | **plggpress exports a Claude Code plugin**: auto-generated plugin (marketplace manifest + .mcp.json pointing at the instance's MCP endpoint + skills generated from content structure). Long-term this replaces the workaholic plugin once qmu.co.jp runs on plggpress. |
| D18 | Sacrificial-architecture pillar | **Adopt as a first-class framework concept.** Durable core = persistent data (SQLite, object storage, git-primary content), the caster-backed domain model, schema + append-only migrations, and external contracts (delivery API, auth subjects/roles/scopes, MCP tools, content models). Sacrificial shell = UI, wiring, flows, even plggmatic declarations. The framework guarantees the boundary via: a single durable `Domain` source that **derives** schema/content-models/API/declarations/MCP-schemas; a **schema-compatibility boot gate** (regenerated app adopts existing data or fails loudly); a **canonical code-independent data export**; deterministic derivation; and a **provenance manifest**. **D4 is the flagship instance.** Sequencing is **hybrid**: the durable-core spine (ticket 31) is a hard prerequisite only for tickets 9/16/17/18; the design-system track (1–8) is unblocked so the D3 theme-first demo lands early. |

## Known constraints honored throughout

- Vendor neutrality / zero new deps; no native bindings; no `as`/`any`/`ts-ignore`.
- Ticket-first workflow; branch names `work-YYYYMMDD-HHMMSS`; commits via commit.sh.
- Coverage >90% (D14 hardens enforcement); fresh `check-all.sh` after dep type changes.
- New packages must be wired into npm-install.sh / build.sh (exact `cd $REPO_ROOT/packages/<name> && npm run build` line format — publish order is sed-derived from it) / check-all.sh / per-package scripts.
- plggpress export map needs types+default entries for require() consumers (concern 51).
- node:sqlite (Node ≥22.6) is the accepted SQLite driver surface behind plgg-sql's Db seam.
- AuthStore take* operations must stay atomic (SELECT+DELETE in one transaction).

## Roadmap phases → tickets

Ticket files live in `.workaholic/tickets/todo/a-qmu-jp/`. Dependencies are
`depends_on` frontmatter entries. Phases group tickets; later-phase tickets
are deliberately coarser and may split during their own design step.

| Phase | Tickets |
|---|---|
| 0 整地 Groundwork | 202607041430**01** cleanup-plgg-press-remnant-and-canonical-manifests; **02** harden-coverage-gate-defaults |
| 1 Design tokens | **03** plggmatic-token-matrix-monochrome-default; **04** palette-override-api-and-scheme-persistence; **05** plggmatic-non-color-design-tokens |
| 2 Effects | **06** plgg-view-cmd-sub-effects |
| 3 Theme rewrite | **07** plggpress-theme-on-plggmatic; **08** tokenize-syntax-highlight-colors |
| 3.5 Durable core | **31** durable-core-sacrificial-shell-boundary (foundational spine per D18; hard prerequisite for 09/16/17/18) |
| 4 Scheduler | **09** declarative-ui-vocabulary-and-scheduler-core; **10** multi-column-renderer; **11** single-column-renderer; **12** action-form-components; **13** rewrite-plggmatic-example-on-declarations |
| 5 Server & data | **14** plggpress-serve-mode-dual-config; **15** plgg-sql-fts5-support; **16** plggpress-content-index-and-delivery-api; **17** frontmatter-yaml-subset-and-content-models |
| 6 Auth & admin | **18** account-domain-roles-and-invites; **19** plggpress-oidc-rp-integration; **20** admin-ui-on-scheduler |
| 7 Collaboration | **21** requests-and-comments-accumulation; **22** guest-editing-and-revisions; **23** media-asset-management |
| 8 RAG | **24** rag-embeddings-and-search |
| 9 Voice agent | **25** realtime-voice-agent |
| 10 MCP & plugin | **26** plgg-mcp-stdio; **27** plgg-mcp-http-oauth; **30** claude-code-plugin-export |
| 11 Rollout | **28** production-topology-and-operations; **29** guide-site-consolidation-and-qmu-replacement |

## Phase quality gates

- Every phase: fresh `scripts/check-all.sh` green; ≥90% coverage on touched packages; no new deps.
- Phase 1: WCAG-AA contrast spec re-verified for every role×variant pair in both schemes.
- Phase 2: all existing Application consumers migrated and green in one branch.
- Phase 3: Playwright side-by-side visual regression old vs new guide before merge (no preview env — this is the only pre-merge visual gate).
- Phase 4: plggmatic-example rewritten declaratively with substantial line-count reduction as the proof-of-value demo.
- Phase 5: SSG output byte-identity regression (dual-mode must not change static output); FTS5 search returns sane results on the real guide corpus.
- Phase 6: authorization-boundary tests (anonymous/guest/admin) on every admin/API route; CSRF coverage.
- Phase 8/9: explicit degraded behavior verified with NO API key configured (FTS5 fallback; agent UI hidden/disabled).
- Phase 10: MCP conformance exercised with a real client (Claude Code) against stdio and HTTP transports.
- Phase 11: production URLs, DNS, backup/restore drill verified.

## Cross-ticket coordination notes (from the coherence review)

The `depends_on` frontmatter — not the phase table above — is authoritative for
/drive ordering; the phase grouping is narrative. The 2026-07-04 coherence pass
surfaced these coordination points, none blocking after the dependency-graph
fixes (ticket 31 added as the durable-core spine; renderer/token edges added to
10/11/12/20; write-tool edge 27→21; voice-accumulation edge 25→21):

- **build.sh ordering is shared and publish-order-authoritative.** Tickets 07,
  16, 19, 26, 27, 28 each touch `scripts/build.sh`. Each must re-derive the full
  order (file:-dep dists before consumers) and preserve the exact
  `cd $REPO_ROOT/packages/<name> && npm run build` line shape — the last one to
  land reconciles, it does not blindly append.
- **Admin surface scope wall (20 vs 21).** Ticket 20 owns the declarative admin
  *shell* (content/account/settings Resources+Actions on the scheduler, per D1);
  ticket 21 adds only the requests/comments *feature* Resources into that shell,
  it does not build a second admin surface.
- **Served-shell injection seam (25 vs 29).** The voice-agent widget (25) and the
  search widget (29 track-1) both extend `packages/plggpress/src/theme/shell.ts`
  through the same after-SSR-escaper injection point; coordinate a single
  injection registry rather than two ad-hoc splices.
- **plgg-kit coverage config is owned by ticket 02** (D14). Tickets 24/25 must
  not create `packages/plgg-kit/plgg-test.config.json`; they depend on 02 having
  done so (their defensive "add if absent" language is a fallback only).
- **OP access-token format decision belongs to ticket 27.** D6 says MCP-over-HTTP
  uses bearer validation via plgg-auth JWKS; that requires the OP to issue **JWT
  access tokens** (RS256, JWKS-verifiable). If the OP issues opaque access
  tokens, ticket 27 must instead validate via token introspection. Decide and
  record in ticket 19/27 before implementing 27.

## Deliberately deferred (tracked as Considerations in tickets, not yet ticketed)

- In-house ANN index for RAG at large corpus scale (D11 revisit trigger).
- SQLite-primary content storage (D4 revisit trigger: guest article editing UX).
- 7-color (secondary/tertiary) tier — awaits a concrete consumer (D9).
- i18n / multilingual content modeling; the `_ja.md` counterpart rule is treated as stale.
- Regeneration of the frozen 2026-02 specs/constraints for the retired-era packages.
- qmu.co.jp content migration mechanics (Astro → plggpress) — assessed in ticket 29 before its own ticket series.
