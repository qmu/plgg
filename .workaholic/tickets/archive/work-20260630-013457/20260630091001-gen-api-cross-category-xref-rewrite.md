---
created_at: 2026-06-30T09:10:01+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 1h
commit_hash: c7bcf11
depends_on:
category: Changed
---

# gen-api.mjs: rewrite cross-category symbol xrefs so generated API anchors resolve

## Overview

Discovered during the guide render-verification: `gen-api.mjs` splits each package's TypeDoc output into per-category pages, but TypeDoc emits symbol cross-references as same-page `#fragment` anchors. After splitting, a symbol referenced from another category becomes a BROKEN cross-page link. plgg-press's `checkLinks` (stricter than VitePress, which never validated anchors) catches 6 such cases in the real guide build:

- `/api/plgg-view/` → `#class_` ×2 (heading `class_()` slugs to `class`, and the symbol may live on another category page)
- `/api/plgg-server/routing` and `/ssg` → `#httprequest` ×2 and `#httperror` (these symbols live on `http.md`)
- `/api/plgg/functionals` → `#invaliderror` (`InvalidError` lives on `exceptionals.md`)

Fix: in the gen-api post-processing, rewrite cross-category symbol links to point at the category page that actually defines the symbol — `/api/<pkg>/<category>#<slug>` — using the symbol→category map gen-api already builds while splitting, and the SAME slug convention plgg-md uses (so `class_()` → `#class`).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the fix stays in packages/guide/scripts/gen-api.mjs
- `workaholic:implementation` / `policies/coding-standards.md` — gen-api transforms follow a data-last pipeline, printWidth 50
- `workaholic:operation` / `policies/ci-cd.md` — the regenerated output must pass plgg-press checkLinks so the deploy build is green

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - the per-package splitter/compactor; add a cross-category xref rewrite using the symbol→category map and the plgg-md slug convention
- `/home/ec2-user/projects/plgg/packages/guide/scripts/verify-render.mjs` - the drift gate; the rewrite must keep golden parity
- `/home/ec2-user/projects/plgg/docs/plgg-press-migration/spike-decisions.md` - the slug algorithm the rewritten anchors must match

## Implementation Steps

1. While splitting a package into category pages, build a map symbol-slug -> owning category page (gen-api already knows which symbols land on which page).
2. Post-process every generated symbol cross-reference: if the target `#slug` is not on the current page, rewrite the link to `/api/<pkg>/<owning-category>#<slug>`; compute the slug with the same convention plgg-md uses (so `class_()` -> `class`, etc.). Leave same-page anchors untouched.
3. Regenerate via `npm run docs:api` and confirm `checkLinks` over the full guide reports ZERO broken generated anchors (the 6 cases resolve); confirm `npm run verify:render` still passes with golden parity.
4. Keep api/* gitignored; only gen-api.mjs is a tracked change.

## Considerations

- These are generated-content bugs VitePress shipped silently (it never checked anchors); plgg-press surfaces them. The fix belongs in the generator, not the authored content.
- Use the symbol→category ownership gen-api already computes; do not hardcode the 6 cases — fix the class of bug so future symbols are covered.
- The slug must match plgg-md exactly (the verify:render gate asserts golden parity), or anchors silently break again.

## Final Report

Development completed as planned. gen-api.mjs now rewrites cross-category symbol xrefs: it ports plgg-md's slugify verbatim, builds a symbol->category+slug ownership map during the per-category split (including each page's h1 so collisions dedup correctly), and rewrites every [name](#frag) to #<slug> on the owning page or /api/<pkg>/<category>#<slug> across pages. Verified: docs:api exit 0; checkLinks 6 broken -> 0; verify:render exit 0 (golden parity preserved); only gen-api.mjs changed; api/* gitignored.

### Discovered Insights

- **Insight**: TypeDoc emits symbol xrefs as same-page #fragments, but compact()'s per-category page split turns cross-category refs into broken cross-page links — AND even same-page refs break when TypeDoc's fragment differs from plgg-md's slug (class_() -> TypeDoc #class_ vs plgg-md #class). VitePress shipped all of these silently broken (no anchor check). Fix builds the ownership map by running a fresh slugger over [h1, ...symbol headings] in document order per page (the same sequence plgg-md sees), so e.g. sql.md gives Sql->#sql-1, sql->#sql-2 (the # Sql h1 consumes #sql).
  **Context**: The rewrite reuses plgg-md's exact slug fold; if plgg-md's slugify ever changes, this ported copy must track it (the verify:render gate would catch drift).
