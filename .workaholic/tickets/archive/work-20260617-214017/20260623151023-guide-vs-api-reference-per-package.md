---
created_at: 2026-06-23T15:10:23+09:00
author: a@qmu.jp
type: refactoring
layer: [UX]
effort: 0.25h
commit_hash: 5c81153
category: Changed
depends_on:
---

# Split each package group into parallel "Guide" and "API reference" children

## Summary

After the per-package sidebar restructure (commit `e470729`), each
package's top-level group links its prose Overview on the **group header**
and shows only an **API reference** child. So in the sidebar a package
appears to contain *only* its API reference — the guide prose is not a
visible item. Make the guide a first-class, visible sidebar item in every
package by giving each package group **two parallel children**:

- **Guide** — the package's prose page(s).
- **API reference** — the generated reference (unchanged).

This is a **labels-only / navigation** change (confirmed with the user):
no new prose content is authored, and `gen-api.mjs` and the generated API
pages are **not** touched. Only `.vitepress/config.ts` changes.

### Agreed structure

For a multi-prose package (only `plgg` core today):

```
plgg (core)            ← group header (toggles; no redundant link)
  Guide                ← link → /packages/plgg/ (Overview)
    Values & effects   → /packages/plgg/values-effects
    Structures & errors→ /packages/plgg/structures-errors
  API reference        → /api/plgg/
    Atomics … Functionals
```

For a single-prose package (plgg-http, plgg-router, plgg-server,
plgg-fetch, plgg-view, plgg-sql, plgg-kit, plgg-foundry):

```
plgg-http
  Guide          → /packages/plgg-http
  API reference  → /api/plgg-http/   (+ category leaves where >1)
```

For `example` (prose-only, no API reference):

```
example (tutorial)
  Guide → /packages/example
```

## Key Files

- `packages/guide/.vitepress/config.ts` — **direct, sole file.** The
  `packageGroup` helper (added in `e470729`) currently builds
  `items: [...docs, ...apiReferenceNode(group)]` and puts the prose
  Overview on the group **header** `link`. Change it so the group's
  children are a **Guide node** then the **API reference node**, and the
  group header no longer carries the (now redundant) prose link. Add a
  `guideNode(group)` helper mirroring the existing `apiReferenceNode`:
  - extra prose pages present (`group.docs`): a collapsible subgroup
    `{ text: "Guide", link: group.overview, collapsed: true, items: docs }`.
  - no extra prose pages: a plain link `{ text: "Guide", link: group.overview }`.
  The `PACKAGE_GROUPS` descriptor list, `apiReferenceNode`, the
  `generatedApi` load + `{}` fallback, the Guide/Contributing groups, and
  the nav all stay as they are.

## Related History

- `archive/work-20260617-214017/20260623140058-merge-packages-api-per-package-sidebar.md`
  (commit `e470729`) — the immediately-preceding restructure that
  introduced `PACKAGE_GROUPS`, `packageGroup`, and `apiReferenceNode`.
  This ticket refines the child layout it produced. **Read first.**

## Implementation Steps

1. **Add `guideNode(group)`** to `config.ts` next to `apiReferenceNode`:
   return the collapsible Guide subgroup when `group.docs` is non-empty,
   else a plain `{ text: "Guide", link: group.overview }`.
2. **Rewrite `packageGroup(group)`** to build
   `items: [guideNode(group), ...apiReferenceNode(group)]` and drop the
   header `link` (the Guide child now carries the prose link). Keep the
   group as `{ text, items }`. (Every package has at least a Guide child,
   so the prior empty-items plain-link fallback is no longer reached, but
   leaving a guard is harmless.)
3. **Verify** (below). Format with Prettier (`printWidth: 50`).

## Considerations

- **UX (design policies).** `self-explanatory-ui` / `modeless-design`:
  surfacing "Guide" as an explicit item parallel to "API reference" makes
  each package's two reading paths (narrative vs. reference) visible and
  reachable without relying on a clickable group header that readers may
  not notice. Labels use the reader's vocabulary ("Guide", "API
  reference").
- **No generator change.** `gen-api.mjs`, the generated `api/*` pages, and
  `api/typedoc-sidebar.json` are untouched; the generated API output is
  gitignored, so this commit is `config.ts` only.
- **Graceful degradation.** In plain `vitepress dev` (no `docs:api` run)
  `apiReferenceNode` returns `[]`, so a package shows just its **Guide**
  child — still correct.
- **Coding rules.** `config.ts` edit; no `as`/`any`/`ts-ignore`. Prettier
  `printWidth: 50` (the guide's own `.prettierrc.json`).

## Verification

1. `cd packages/guide && npm run build` (runs `docs:api` then
   `vitepress build`) — succeeds with no dead links.
2. `scripts/serve-guide.sh` (or build + preview) — each package group
   shows a **Guide** item and (where applicable) an **API reference**
   item; `plgg` core's Guide expands to Values & effects + Structures &
   errors; `example` shows only Guide.

## Final Report

Development completed as planned. Added `guideNode(group)` next to
`apiReferenceNode(group)` and rewrote `packageGroup(group)` to return
`{ text, items: [guideNode(group), ...apiReferenceNode(group)] }` with no
header link. `config.ts`-only change; Prettier reported it already matched
`printWidth: 50`. Full `npm run build` passes with no dead links.

### Discovered Insights

- **Insight**: `guideNode` and `apiReferenceNode` are deliberately the two
  symmetric halves of a package group — Guide first (prose), API reference
  last (generated). Future per-package navigation tweaks should keep that
  parallel: add to one helper, mirror in the other.
  **Context**: The group header no longer carries a `link`, so the Guide
  child is the *only* path to a package's Overview prose — don't drop it
  when editing, or the Overview page becomes unreachable from the sidebar.
