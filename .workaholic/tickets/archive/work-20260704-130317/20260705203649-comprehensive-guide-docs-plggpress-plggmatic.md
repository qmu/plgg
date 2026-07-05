---
created_at: 2026-07-05T20:36:49+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: 3c1b456b
category: Changed
depends_on: []
---

# Guide docs pt.1 — plggmatic framework section (scheduler, design system, renderers/forms), plggmatic-example workbench page, plgg-parser + plgg-domain Vocabulary pages, and the deliberate IA wiring

## Overview

The 20-ticket roadmap (branch `work-20260704-130317`, PR #60) shipped plggmatic
(declarative UI framework) — but the guide (`packages/guide/`) has **no
plggmatic page at all**, and none of the new packages have guide pages. The
developer needs comprehensive docs in the guide "to see what this is". This is
**part 1 of a two-ticket docs pass** (part 2 =
`20260705203650-guide-docs-plggpress-cms-section.md`, which depends on this
one).

This ticket delivers the plggmatic side:

1. **A new top-level "plggmatic" sidebar section** (beside "plggpress"):
   `packages/guide/packages/plggmatic/index.md` (overview) + sub-pages for the
   declarative scheduler (declare → schedule → Scene), the design system
   (token matrix, palettes, appearance persistence, non-color tokens), and
   renderers & forms (multi-column, single-column, action/form components).
2. **A plggmatic-example workbench page** (distinctly labeled from the
   existing "example (tutorial)" leaf) cross-linked from the plggmatic pages.
3. **Vocabulary pages** for plgg-parser and plgg-domain (each the standard
   4-part package page).
4. **Deliberate IA wiring** in `packages/guide/site.config.ts` **and** the
   matching `packages/guide/contributing/conventions.md` update (the guide's
   own contract requires IA changes to update conventions.md alongside; also
   fix its stale `PACKAGE_GROUPS` name — the real variable is
   `LIBRARY_PACKAGES`).

## Key files

- `packages/guide/site.config.ts` — the IA contract (defineSite-validated).
  Add the plggmatic section; extend `LIBRARY_PACKAGES` with plgg-parser and
  plgg-domain; add the plggmatic-example leaf. Use the existing `leaf()`
  helper; nodes are `{text, link?, items: []}`; Prettier printWidth 50 — do
  not hand-pack. No as/any/ts-ignore.
- `packages/guide/contributing/conventions.md` — the doc-authoring contract
  (4-part page shape; real-code samples only; IA-change rule). Update
  alongside the IA change; fix the stale `PACKAGE_GROUPS` term.
- `packages/guide/packages/plgg-sql.md`, `plgg-http.md` — exemplar pages
  (structure, tone, vocabulary-table idiom, root-absolute links). plgg-http is
  conventions.md's named reference implementation; imitate plgg-sql for
  length (~150 lines).
- Source material (real-code samples MUST come from here, never invented):
  - `packages/plggmatic/README.md` (133 lines: scheduler + design system,
    runnable declare/schedule sample).
  - `packages/plggmatic-example/src/` (`declaration.ts`, `app.ts`, `forms/`) —
    the ~62% code-cut proof (263-line declaration vs 691 hand-written).
  - `packages/plgg-parser/README.md`, `packages/plgg-domain/README.md`.
  - Archived Final Reports in
    `.workaholic/tickets/archive/work-20260704-130317/`: `…143009` (scheduler
    core), `…143003`–`…143005` (tokens), `…143010`–`…143012`
    (renderers/forms), `…143013` (example rewrite), `…143031` (plgg-domain
    durable-core thesis).

## Related history

- `.workaholic/stories/work-20260630-013457.md` — the guide + plggpress engine
  were built here; establishes the site.config.ts/defineSite pattern. Its
  concern: guide chrome (site.config/theme) changes appear on the tunnel only
  after the guide container restarts (dev loads config at startup).
- `.workaholic/stories/work-20260703-050355.md` — set the current
  oracle-matched sidebar IA; add sections rather than disturbing
  Guide/Core/Vocabulary.
- `.workaholic/stories/work-20260704-130317.md` + PR #60 — the authoritative
  feature inventory (decision records D1–D18 in the archived tickets are the
  accuracy source).

## Implementation steps

1. **IA first**: extend `site.config.ts` — new "plggmatic" section (Overview /
   Declarative scheduler / Design system / Renderers & forms leaves),
   `LIBRARY_PACKAGES` + plgg-parser + plgg-domain, and a distinctly-labeled
   plggmatic-example leaf. Verify `defineSite` still returns Ok via
   `scripts/tsc-plgg.sh`.
2. **plggmatic pages**: `packages/guide/packages/plggmatic/index.md` +
   sub-pages (scheduler, design-system, renderers-forms) following the 4-part
   conventions.md shape, samples from the plggmatic README and
   plggmatic-example source. Respect the disambiguation: document the CURRENT
   UI framework, not the retired app-framework facade (absorbed into
   `plggpress/src/framework/`).
3. **plggmatic-example page**: a workbench page describing the declaration
   rewrite and forms showcase, with samples from its real source.
4. **Vocabulary pages**: one 4-part page each for plgg-parser and plgg-domain
   (frame plgg-domain as the durable core the sacrificial shell derives from).
5. **conventions.md**: record the IA change and fix the stale
   `PACKAGE_GROUPS` → `LIBRARY_PACKAGES` reference.
6. **Verify** (see Quality Gate) and commit.

## Considerations

- **Routing is file-presence** (`foo.md` or `foo/index.md` → `/foo`); sidebar
  wiring is separate navigation. Both are required per page. Sidebar links are
  NOT dead-link-checked — hand-verify each new sidebar link against a rendered
  page (a typo there is a silent dead nav).
- **The dead-link gate runs only at `cd packages/guide && npm run build`** —
  it is NOT in check-all.sh. Run it explicitly; it validates page-body links
  and `#fragments` against discovered routes + real heading slugs.
- **Do NOT internal-link to `packages/site/` pages** (plggmatic's separate
  design-system gallery is outside the guide's link graph — such links fail
  the guide build). Reference by name/GitHub, or link to the guide's own
  plggmatic-example page.
- Author internal links **root-absolute** (`/packages/…`, `/concepts/…`); the
  href resolver applies DOCS_BASE.
- Objective-documentation policy: describe actual shipped behavior; no
  evaluative adjectives; document decisions ("why it exists"), not mechanics;
  stable heading anchors so AI agents can cite page+section.
- The guide container (`workloads/guide/compose.yaml`, running as
  `guide_guide_1` on :5181) loads site.config at startup — **restart it** to
  see IA changes on localhost:5181 / plgg-guide.qmu.dev.
- Docs ride this branch and join PR #60; the branch story/PR body update
  happens at ship time.

## Quality Gate

Approval requires ALL of (developer-confirmed 2026-07-05):

1. `cd packages/guide && npm run build` **green** — the plggpress dead-link +
   fragment + content-model gate passes with the new pages.
2. `scripts/tsc-plgg.sh` **green**; `site.config.ts` edits contain **no
   as/any/ts-ignore**; Prettier (printWidth 50) clean.
3. Guide container restarted; **every new page renders** at
   http://localhost:5181 and **every new sidebar entry navigates** to its page
   (hand-checked — sidebar links are not build-gated).
4. **Coverage criterion (part-1 scope)**: the plggmatic scheduler, design
   system, renderers & forms, the plggmatic-example workbench, plgg-parser,
   and plgg-domain each appear in the rendered guide with at least one section
   and a **real-code sample** (per conventions.md: pulled from package
   source/tests/examples, never invented).
5. `packages/guide/contributing/conventions.md` updated alongside the IA
   change (including the `PACKAGE_GROUPS` → `LIBRARY_PACKAGES` fix).

## Final Report

Development completed as planned. Added a new top-level **plggmatic** sidebar
section (Overview / Declarative scheduler / Design system / Renderers & forms /
Workbench) beside plggpress, seven new guide pages, and the `plgg-domain` /
`plgg-parser` Vocabulary leaves — all wired deliberately in
`packages/guide/site.config.ts` with the matching `conventions.md` IA-change
note and the `PACKAGE_GROUPS` → `LIBRARY_PACKAGES` drift fixed.

### What was built

- `packages/guide/packages/plggmatic/index.md` — overview of the two halves
  (scheduler + design system), vocabulary, disambiguation from the retired
  app-framework facade.
- `packages/guide/packages/plggmatic/scheduler.md` — declare → schedule →
  Scene, the closed-union vocabulary, mode-agnostic derivation (D1/D10),
  effects-at-the-edge.
- `packages/guide/packages/plggmatic/design-system.md` — color matrix,
  palette override + WCAG audit, non-color tokens, framework-owned appearance
  persistence.
- `packages/guide/packages/plggmatic/renderers-forms.md` — multi/single-column
  renderers, `renderMode`/`toggleMode`, caster-parsed forms.
- `packages/guide/packages/plggmatic-example.md` — the 691→263-line
  declaration workbench + forms showcase.
- `packages/guide/packages/plgg-parser.md`, `plgg-domain.md` — 4-part
  Vocabulary pages, samples from the packages' own specs/example.

Every code sample is pulled from real package source (README samples, the
example's `declaration.ts`/`app.ts`, `repeat.spec.ts`, `example.ts`) per the
conventions.md real-code rule.

### Verification (Quality Gate cleared)

- `cd packages/guide && npm run build` **green** — built **39 pages** (was 32);
  the dead-link/fragment gate passed with all new pages and cross-links.
- `scripts/tsc-plgg.sh` **green**; `site.config.ts` has no as/any/ts-ignore;
  Prettier (printWidth 50) applied.
- Guide container `guide_guide_1` restarted; all 7 new routes return HTTP 200
  with correct `<h1>`, and all 7 new sidebar links are present on the rendered
  home page (hand-verified).
