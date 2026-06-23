---
created_at: 2026-06-23T14:00:58+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Config]
effort: 1h
commit_hash: e470729
category: Changed
depends_on:
---

# Merge Packages + API reference into a unified per-package sidebar tree

## Summary

Restructure the plgg guide (`packages/guide`) sidebar so that the two
separate top-level groups — **Packages** (hand-authored prose) and **API
reference** (generated) — are merged into **one top-level group per
package**. Each package group holds its prose guide docs first (second
level), then its API reference last (third level). For the **plgg core**
package the API reference is split into **one separate page per
source-derived category** (Atomics, Basics, Disjunctives, Contextuals,
Conjunctives, Collectives, Exceptionals, Flowables, Functionals) instead
of today's single dense page with `## Category` headings. Other packages
likewise split by their own categories where they have more than one.

This reverses the IA decision in
`archive/.../20260618102233-refocus-package-guidance-concepts.md`, which
deliberately kept the two groups separate. That is an accepted breaking
IA change (plgg is its own only consumer; breaking changes are fine).

### Agreed design (confirmed with the user — do not re-litigate)

1. **Top level** — one sidebar group per package, in this explicit order:
   `plgg`, `plgg-http`, `plgg-router` first, then `plgg-server`,
   `plgg-fetch`, `plgg-view`, `plgg-sql`, `plgg-kit`, `plgg-foundry`, and
   `example`. **All** packages stay as top-level groups (none dropped).
2. **Second level** (inside each group) — that package's prose guide
   pages, first. For `plgg` core: Overview (`/packages/plgg/`),
   Values & effects, Structures & errors. Others: their single prose
   page. `example` is **prose-only** (no API reference).
3. **Third level** (end of each group) — that package's API reference,
   with one **separate page per category** (e.g. `/api/plgg/atomics`,
   `/api/plgg/basics`, …), ordered by the canonical taxonomy. Packages
   with a single category collapse to one reference page/link.

The **Guide** group (Getting started, Core concepts) and the
**Contributing** group stay exactly as they are.

## Key Files

- `packages/guide/.vitepress/config.ts` — **direct.** The hand-authored
  sidebar tree. The standalone `Packages` group (lines ~116–170) and
  `API reference` group (lines ~171–180) must both be deleted and
  replaced by one top-level group per package, built in the new explicit
  order, each = `{ text: <pkg>, items: [...prosePages, ...apiCategorySubtree] }`.
  The load logic (lines ~14–28) that reads `api/typedoc-sidebar.json`
  stays, but the parsed value changes shape from a flat
  `{text,link}[]` to a **per-package keyed** structure; config indexes it
  by package name with a `[]` fallback so plain `vitepress dev` (no
  generation) still renders prose-only groups. Review the nav `API` link
  (line ~66) and the nav `Packages` link (line ~63).
- `packages/guide/scripts/gen-api.mjs` — **direct.** Build-time generator
  (Node ESM). Today `compact()` returns ONE markdown string (all
  categories under `## <Category>`) written to `api/<pkg>/index.md`, and
  `collectSidebar()` emits a flat `{text,link}` per package into
  `api/typedoc-sidebar.json`. Change it to: emit **one file per category**
  under `api/<pkg>/` (plus a package landing `index.md`), and emit a
  **nested per-package + per-category** sidebar JSON. Reuse
  `byCategory` + `orderCategories()` (already bucket symbols per category)
  and `PREFERRED_CATEGORY_ORDER` (lines ~73–83) verbatim for both page and
  sidebar-leaf order. Add a deterministic category→slug lowercase mapping
  for the `/api/<pkg>/<slug>` URLs. **Keep the symbol-count assertion**
  (`blocks.length === originalSymbols`) so the split still proves no
  public symbol is dropped.
- `packages/guide/api/` — **direct.** Generated output. After the change
  `api/<pkg>/` holds one page per category + a landing `index.md`, and
  `api/typedoc-sidebar.json` becomes the nested per-package structure.
  Verified category counts: `plgg` 9 (the PREFERRED set); `plgg-server` 4
  (Http/Routing/Ssg/View); `plgg-sql` 3; `plgg-foundry` 2; the rest 1
  each. `example` is not in `PACKAGES` and has no generated API.
- `packages/guide/api/index.md` — **usage.** Hand-authored API Overview
  with a per-package link list that duplicates the sidebar. Once the
  dedicated API group is gone its role changes — decide: drop it, keep it
  reachable only via the nav `API` link, or repurpose as a landing.
  Prose pages also link their API via "Full API reference" tips pointing
  at `/api/<pkg>/`; those must still resolve (keep the package landing).
- `packages/guide/typedoc.base.json` — **config.** `outputFileStrategy:
  "modules"` is why TypeDoc emits one `index.md` per entry point (the unit
  `compact()` rewrites). The per-category split is done in gen-api.mjs
  post-processing, so this file stays as-is.
- `packages/guide/package.json` — **config.** `docs:api` = `node
  scripts/gen-api.mjs`; `build` = `docs:api && vitepress build`. No script
  change needed — keep generation behind the existing npm scripts (see
  command-scripts policy; do NOT add a bespoke wrapper).

## Related History

The guide's sidebar and generator were built across a sequence of
now-archived tickets; this change rewires what they produced:

- `archive/work-20260617-214017/20260617214004-guide-api-autogen-and-ci.md`
  — original author of `gen-api.mjs` and the config.ts API sidebar (the
  flat per-package subtree merged via `api/typedoc-sidebar.json`).
- `archive/work-20260617-214017/20260618175227-compact-signature-index-api-reference.md`
  — introduced the source-derived category regrouping
  (Atomics…Functionals) and the per-symbol categorization scan this
  change reuses for the per-category page split. **Critical prior art.**
- `archive/work-20260617-214017/20260618102233-refocus-package-guidance-concepts.md`
  — the IA decision (two separate top-level groups) this ticket reverses.
- `archive/work-20260617-214017/20260618102232-condense-curate-api-reference.md`
  — shaped which symbols appear in the reference (context for page content).
- `archive/work-20260617-214017/20260617213958-guide-getting-started-and-concepts.md`
  — the Guide / Core concepts groups left unchanged here.

## Implementation Steps

1. **gen-api.mjs — split pages.** Refactor `compact()` (and its tail,
   ~lines 459–485) so that after building `byCategory` it returns, per
   category in `orderCategories()` order, a page `{ category, slug,
   content }` (heading `# <Category>` + that category's blocks), plus the
   package landing `index.md` content (title + short intro + links to the
   category pages). Keep `title`, `blocks`, `originalSymbols`, and the
   `blocks.length === originalSymbols` assertion intact.
2. **gen-api.mjs — write per-category files + nested sidebar.** In the
   final loop (~506–519), write each category page to
   `api/<pkg>/<slug>.md` and the landing to `api/<pkg>/index.md`. Replace
   `collectSidebar()` with a builder returning the nested entry
   `{ text: pkg, link: '/api/<pkg>/', items: orderedCategories.map(c =>
   ({ text: c, link: '/api/<pkg>/<slug>' })) }`. When a package has a
   single category, emit just the package link (no `items`). Write the
   nested structure to `api/typedoc-sidebar.json` keyed/indexable by
   package name. Ensure stale per-category files from prior runs are
   cleaned (the existing `rmSync(out, …)` in `generate()` already wipes
   `api/<pkg>/` before TypeDoc regenerates — confirm ordering so the new
   pages survive).
3. **gen-api.mjs — header comment.** Update the file's top comment to
   describe the new one-page-per-category output (objective-documentation:
   docs must match actual behavior, reviewed in the same change).
4. **config.ts — merge groups.** Delete the `Packages` and `API
   reference` groups. Add a small pure helper that, given the explicit
   package order + the prose-page map + the parsed per-package generated
   subtree, returns one sidebar group per package
   (`{ text, items: [...prose, ...apiSubtree] }`). `example` is
   prose-only. Keep the `existsSync`/`[]` fallback so dev-without-generation
   renders prose-only groups. Express the tree as a generated value from
   the data, not accreted mutation (functional-programming policy).
5. **config.ts — nav.** Update the top nav so `Packages`/`API` links
   point somewhere sensible under the new IA (e.g. nav `Packages` → first
   package; decide whether to keep a top-level `API` entry given the
   Overview page's changed role).
6. **api/index.md.** Resolve the Overview page's role per the Key Files
   note (drop / nav-only / repurpose). Ensure no prose "Full API
   reference" tip becomes a dead link.
7. **Verify** (see below).

## Considerations

- **UX / navigability (design policies).** Per `self-explanatory-ui` and
  `modeless-design`, the merged per-package tree keeps each package's
  concepts and API reachable without jumping between two disjoint groups;
  the per-category split is exactly the "organize information vertically
  via grouping" practice. Category/page labels use the reader's
  vocabulary — keep the source-derived category names (Atomics, Basics, …)
  as the visible labels. Give every category page a **stable URL** so it
  can be linked/cited (also serves `accessibility-first`: machine-readable,
  traceable to page+section for AI consumers).
- **Generator structure (implementation policy).** `functional-programming`:
  keep TypeDoc invocation + file I/O as the thin shell at the entry point;
  make page-derivation and category grouping pure transforms over data.
  The sidebar JSON must be a generated value of a pure transform, not
  hidden mutable state. `gen-api.mjs` is a build-time leaf tool — it reads
  package source/TypeDoc output and writes only into `packages/guide/api/`;
  it must not be imported by or coupled to any `packages/` library code.
  config.ts depends on the generator's on-disk JSON, never the reverse.
- **Command-scripts / CI (implementation + operation policies).** Keep
  generation behind the existing `npm run docs:api` / `npm run build`;
  **do not** add a bespoke per-command shell wrapper. CI must invoke the
  same command developers run, and output must be deterministic so the
  published site is reproducible.
- **Coding rules scope.** `gen-api.mjs` is a Node ESM tool, so the
  packages/-scoped TS rules (no `as`/`any`/`ts-ignore`, `tsc-plgg.sh`
  gate) and the >90% coverage gate do **not** bind it. Prettier
  (`printWidth: 50`, the guide's own `.prettierrc.json`) **does** apply to
  both edited files. No new test suite is required; correctness is proven
  by the build + rendered-output inspection (the symbol-count assertion is
  the in-generator guard).
- **No automated tests cover the guide.** Verification is behavioral.

## Verification

1. `cd packages/guide && npm run docs:api` — regenerates per-category
   pages (`api/plgg/atomics.md`, …) and the nested
   `api/typedoc-sidebar.json` **without throwing** (the symbol-count
   assertion must still pass for every package).
2. `npm run build` (runs `docs:api` then `vitepress build`) — succeeds
   with **no dead links**; every new `/api/<pkg>/<category>` URL resolves.
3. `scripts/serve-guide.sh` (vitepress dev) — confirm the sidebar shows
   one group per package in the agreed order, prose pages first, API
   reference (with category subtopics for plgg core) last, and that dev
   still renders prose-only groups when generation hasn't run.
4. Spot-check: `plgg` shows 9 category pages; `example` is prose-only;
   single-category packages collapse to one reference link.

## Final Report

Development completed as planned. `compact()` was refactored to return
`{ title, pages }`; the final loop writes one `<slug>.md` per category
plus a landing `index.md` (single-category packages write their one
category straight to `index.md`), and emits `typedoc-sidebar.json` as a
per-package map. `config.ts` replaced the two flat groups with a
`PACKAGE_GROUPS` descriptor list and pure `apiReferenceNode`/`packageGroup`
builders. `npm run docs:api` and full `npm run build` both pass with no
dead links: plgg → 9 category pages, plgg-server 4, plgg-sql 3,
plgg-foundry 2, the rest collapse to one link, `example` prose-only.

### Discovered Insights

- **Insight**: The generated API output is gitignored
  (`packages/guide/.gitignore`: `api/*/` and `api/typedoc-sidebar.json`),
  so this change commits only the two source files — the per-category
  pages and the sidebar map are rebuilt on every `npm run build`.
  **Context**: The generator and its consumer (`config.ts`) are coupled
  only through the on-disk JSON contract, which is never committed; the
  shapes must be changed together (they were) or dev/CI silently diverge.
- **Insight**: Single-category packages intentionally have no `<slug>.md`
  — their one category renders directly as the `/api/<pkg>/` landing, and
  the sidebar entry carries an empty `items: []` so `config.ts` emits a
  plain "API reference" link (no collapsible). Multi-category packages get
  a link-list landing plus a collapsed subtree.
  **Context**: Prose pages link to `/api/<pkg>/` via "Full API reference"
  tips, so a landing must always exist at that path regardless of category
  count; this keeps those links resolving.
