---
created_at: 2026-07-05T20:36:50+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: a13e9271
category: Changed
depends_on: [20260705203649-comprehensive-guide-docs-plggpress-plggmatic.md]
---

# Guide docs pt.2 — plggpress multi-page CMS section (serve, content & delivery, auth & admin, agent surfaces, operations) and plgg-content / plgg-auth / plgg-mcp Vocabulary pages

## Overview

Part 2 of the two-ticket docs pass (part 1 =
`20260705203649-comprehensive-guide-docs-plggpress-plggmatic.md`, which
establishes the IA-change conventions). The guide's
`packages/guide/packages/plggpress.md` is **stale**: it still describes
plggpress as *only* a VitePress-like SSG, predating the entire CMS roadmap.
The `/api` `/admin` `/auth` `/mcp` mounts its "serve" paragraph names are the
correct spine to expand.

This ticket rewrites the plggpress section as a **multi-page CMS section** and
pages the three content-platform libraries:

1. **plggpress Overview rewritten** to reflect what plggpress now is: the SSG
   that builds this guide AND a served CMS (D5 dual-mode).
2. **Sub-pages under `/packages/plggpress/…`**:
   - *Content & delivery* — the git-primary corpus, plgg-content derived
     SQLite index, frontmatter content models, FTS5 search, the MicroCMS-like
     read-only delivery API.
   - *Auth & admin* — OIDC OP+RP dogfooding (auth-code + S256 PKCE), the
     account domain (WebCrypto passwords, roles, single-use invites), the
     scheduler-declared admin UI, and the three DB-primary domains
     (stakeholder conversations, guest drafts/revisions, media assets).
   - *Agent surfaces* — RAG opt-in embeddings tier (graceful BM25 fallback),
     the browser voice agent over OpenAI Realtime, MCP over stdio AND
     Streamable HTTP/OAuth 2.1, and the installable Claude Code plugin export.
   - *Operations* — from `packages/plggpress/OPERATIONS.md`: cloudflared-fronted
     always-on process, SQLite WAL + single-writer, backup/restore drill,
     health endpoint, operator-secret posture, progressive feature lighting.
3. **Vocabulary pages** for plgg-content, plgg-auth, plgg-mcp (each the
   standard 4-part package page).
4. **IA wiring** in `packages/guide/site.config.ts`: the plggpress section
   grows Overview / Content & delivery / Auth & admin / Agent surfaces /
   Operations leaves; `LIBRARY_PACKAGES` + plgg-content + plgg-auth +
   plgg-mcp.

## Key files

- `packages/guide/packages/plggpress.md` — the stale overview to rewrite
  (convert to `plggpress/index.md` + sub-pages, or keep the flat overview file
  and add `plggpress/…` sub-pages — plggpress routes `foo.md` and
  `foo/index.md` identically; mirror how `packages/guide/packages/plgg/`
  does it).
- `packages/guide/site.config.ts` — expand the plggpress section; extend
  `LIBRARY_PACKAGES`. leaf() helper, printWidth 50, no as/any/ts-ignore.
- Source material (real-code samples MUST come from here, never invented):
  - `packages/plggpress/README.md` (three-modes table naming the
    `/api` `/admin` `/auth` `/mcp` mounts), `packages/plggpress/OPERATIONS.md`
    (80-line production runbook).
  - `packages/plgg-content/README.md` (openIndex/registerCollection/
    indexDocument/rebuildIndex/listCollection/getDocument/searchIndex sample).
  - `packages/plgg-auth/README.md` (Jose layer, mountOidc, AuthStore seam,
    sqlStore, rotation).
  - `packages/plgg-mcp/README.md` — **covers only the stdio half**; the
    HTTP/OAuth resource-server half lives in the archived report
    `.workaholic/tickets/archive/work-20260704-130317/20260704143027-plgg-mcp-http-oauth.md`.
  - Archived Final Reports `…143014`–`…143017` (serve, FTS5, content index,
    content models), `…143018`–`…143023` (accounts, OIDC, admin,
    stakeholder/drafts/media), `…143024`–`…143025` (RAG, voice agent),
    `…143026`/`…143030` (MCP stdio, plugin export), `…143028` (operations).

## Related history

- Part 1 ticket (dependency): establishes the plggmatic section, the
  conventions.md IA-change note, and the exemplar-following style this ticket
  continues.
- `.workaholic/stories/work-20260704-130317.md` + PR #60 — the authoritative
  CMS feature inventory.
- `.workaholic/tickets/archive/work-20260704-130317/20260704143029-…` (ticket
  29) — rollout/topology; deliberately deferred this doc pass.

## Implementation steps

1. **IA**: expand the plggpress sidebar section (Overview / Content &
   delivery / Auth & admin / Agent surfaces / Operations) and extend
   `LIBRARY_PACKAGES` with plgg-content, plgg-auth, plgg-mcp. Verify
   `defineSite` Ok via `scripts/tsc-plgg.sh`.
2. **Overview rewrite**: plggpress = the guide's SSG engine + a served CMS;
   the D5 dual-mode framing (static reader on Pages, served instance behind
   cloudflared); cross-link every sub-page.
3. **Sub-pages** per the Overview list above, each following the 4-part
   conventions.md shape with real-code/config samples; note the deploy-time
   placeholder posture honestly (operator keys → graceful darkness; the served
   features light up when keys/stores are configured — ticket 29's progressive
   lighting).
4. **Vocabulary pages**: one 4-part page each for plgg-content, plgg-auth,
   plgg-mcp (the plgg-mcp page documents BOTH transports).
5. **Verify** (see Quality Gate) and commit.

## Considerations

- All part-1 considerations apply verbatim: file-presence routing + separate
  sidebar wiring; the dead-link gate only at `cd packages/guide && npm run
  build`; sidebar links not build-gated (hand-verify); no internal links to
  `packages/site/`; root-absolute links; objective-documentation policy;
  container restart to see IA changes; docs ride PR #60.
- Do not resurrect the retired plggmatic app-framework facade meaning — the
  framework plggpress carries internally was absorbed from it; the name
  plggmatic now belongs to the UI framework (documented in part 1).
- The voice agent + RAG pages must state the graceful-darkness behavior
  factually (no key → `/api/agent/session` 404, UI hidden; no LLM key → FTS5
  BM25 only) — that IS the shipped behavior.

## Quality Gate

Approval requires ALL of (developer-confirmed 2026-07-05):

1. `cd packages/guide && npm run build` **green** — the dead-link + fragment +
   content-model gate passes with the new pages.
2. `scripts/tsc-plgg.sh` **green**; `site.config.ts` edits contain **no
   as/any/ts-ignore**; Prettier (printWidth 50) clean.
3. Guide container restarted; **every new page renders** at
   http://localhost:5181 and **every new sidebar entry navigates** to its page
   (hand-checked).
4. **Coverage criterion (completes the pass)**: each roadmap capability —
   serve mode, content spine + FTS5 + delivery API, OIDC auth + accounts,
   admin UI, stakeholder/drafts/media domains, RAG search, voice agent, MCP
   stdio AND HTTP/OAuth, plugin export, operations — appears in the rendered
   guide with at least one section and a **real-code sample** (per
   conventions.md: pulled from package source/tests/examples, never
   invented).

## Final Report

Development completed as planned. Rewrote the stale plggpress overview into a
multi-page CMS section and added the three content-platform Vocabulary pages,
completing the roadmap-documentation pass begun in pt.1.

### What was built

- `packages/guide/packages/plggpress.md` — rewritten Overview: the SSG that
  builds the guide AND the served content platform (D5 one-render-path), the
  three-modes table, and links into the four sub-pages.
- `packages/guide/packages/plggpress/content-delivery.md` — git-primary corpus,
  the derived plgg-content SQLite index, frontmatter content models, the
  MicroCMS-like `/api` delivery + FTS5 search (real `searchIndex`/`listCollection`
  sample).
- `.../plggpress/auth-admin.md` — OIDC OP+RP dogfooding (real `mountOidc`
  sample), the account domain, the scheduler-declared SSR `/admin` UI + CSRF,
  and the three DB-primary domains (stakeholder / drafts / media).
- `.../plggpress/agent-surfaces.md` — opt-in RAG (graceful BM25 fallback), the
  voice agent (`POST /api/agent/session`, dark with no key), MCP over stdio AND
  OAuth-protected HTTP (read vs. write scopes), and the Claude Code plugin
  export.
- `.../plggpress/operations.md` — the D5 dual-mode topology, `GET /health`,
  SQLite WAL + single-writer, `VACUUM INTO` backup/restore drill, and
  operator-secret posture.
- `packages/guide/packages/plgg-content.md`, `plgg-auth.md`, `plgg-mcp.md` —
  4-part Vocabulary pages with samples from each package's README/source.

Sidebar: the plggpress section grew from a single Overview leaf to five pages;
`LIBRARY_PACKAGES` gained plgg-content, plgg-auth, plgg-mcp. Every code sample
is real (plgg-content/plgg-auth READMEs, OPERATIONS.md, ticket-27 report).

### Verification (Quality Gate cleared)

- `cd packages/guide && npm run build` **green** — built **46 pages** (was 39
  after pt.1); the dead-link/fragment gate passed with all sub-page cross-links
  and the flat-file/`plggpress/` sub-route split (no route collision).
- `scripts/tsc-plgg.sh` **green**; `site.config.ts` has no as/any/ts-ignore;
  Prettier applied. (Caught and fixed a Prettier hazard where a line-wrapped
  `+ dynamic-client-registration` rendered as a stray bullet — reworded to
  parenthetical prose.)
- Guide container restarted; all 8 new/rewritten routes return HTTP 200 with
  correct `<h1>`, and all 7 new sidebar links are present on the rendered home
  (hand-verified).
