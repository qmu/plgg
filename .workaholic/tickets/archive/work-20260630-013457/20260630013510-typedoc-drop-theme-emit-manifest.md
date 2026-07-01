---
created_at: 2026-06-30T01:35:10+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort: 1h
commit_hash: 76bd41c
category: Changed
depends_on: [20260630013458-md-corpus-spike-and-decisions.md]
---

# Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest

## Overview

Remove typedoc-vitepress-theme from the typedoc plugin list (keeping typedoc-plugin-markdown), flatten output (parametersFormat/indexFormat -> list) toward the shape plgg-md handles best, and rewire gen-api.mjs so its emitted per-package API sidebar manifest is consumed by the new plgg-press-typed site config rather than VitePress. Normalize any out-of-subset construct the spike flagged. This is the keep-typedoc/drop-theme decision made concrete; the render-VERIFICATION of the output against golden snapshots is a separate later ticket (items 10 & 20). typedoc stays a guide build devDep and is NOT folded into plgg-press.

**Proof of value:** `npm run docs:api` regenerates api/<pkg>/*.md with the theme removed and the plain manifest emitted; the spike's golden diff confirms acceptable parity and the output stays within the documented subset.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — config + build-script changes stay in packages/guide
- `workaholic:implementation` / `policies/coding-standards.md` — gen-api.mjs transforms follow house data-last pipeline style
- `workaholic:implementation` / `policies/vendor-neutrality.md` — removing the vitepress theme plugin must not pull in any replacement dep; typedoc-plugin-markdown stays

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/typedoc.base.json` - remove 'typedoc-vitepress-theme' from plugin[]; keep typedoc-plugin-markdown; set parametersFormat/indexFormat to 'list'
- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - drop vitepress-theme assumptions; keep markdown compaction + per-package sidebar emission; emit the plain manifest consumed by site.config.ts
- `/home/ec2-user/projects/plgg/packages/guide/api/index.md` - hand-authored API landing using ::: tip; confirm it stays within the plgg-md subset

## Dependencies

- Depends on [20260630013458-md-corpus-spike-and-decisions.md](20260630013458-md-corpus-spike-and-decisions.md) — Spike: inventory the Markdown corpus, capture EXACT VitePress slugs + language inventory, regenerate typedoc theme-less, and RECORD the grammar/slug/hero/raw-HTML decisions

## Implementation Steps

1. Edit typedoc.base.json: remove 'typedoc-vitepress-theme' from the plugin array (leave 'typedoc-plugin-markdown'); switch parametersFormat and indexFormat from 'table' to 'list' per the spike findings.
2. In gen-api.mjs, remove logic that assumed the vitepress theme; keep the existing per-package compaction/sub-table stripping and the sidebar manifest emission, reshaping it into the plain manifest site.config.ts will import (keep JSON shape for minimal diff).
3. Run `npm run docs:api` and verify the regenerated api/<pkg>/*.md stays within plgg-md's subset; add a normalization pass for any residual raw HTML / unsupported construct the spike flagged.
4. Confirm api/ output and the manifest remain gitignored as before; do NOT remove vitepress itself here (the vitepress-removal ticket).

## Considerations

- Tight coupling between typedoc output shape and the parser: a typedoc minor bump can drift; the build later fails loudly (renderMarkdown -> Err) rather than emitting broken HTML.
- Flattening to 'list' may lengthen some API pages; acceptable for v1, tunable in the theme.
- The plgg-md render-VERIFICATION of regenerated pages against golden snapshots is the separate guide/TypeDoc ticket, so this ticket depends only on the spike.

## Final Report

Development completed as planned. Dropped typedoc-vitepress-theme (kept typedoc-plugin-markdown), removed the theme-only docsRoot, set parametersFormat/indexFormat to list, and rewired gen-api.mjs for theme-off output. Verified: `npm run docs:api` EXIT 0; regenerated 32 api/*.md within the plgg-md subset (only h1/h2 + ts fences; no raw HTML/tables/h3-h6); only 2 tracked files changed; api/* stays gitignored.

### Discovered Insights

- **Insight**: Theme-off, typedoc-plugin-markdown emits the module landing as README.md (not index.md) and hard-errors on the theme-only docsRoot option (both spike findings confirmed). gen-api now reads README.md, compacts it, writes index.md, and removes the raw README.md. A fence-aware normalize() folds the `typescript` @example fence alias to `ts` before compact().
  **Context**: This shapes what the guide/TypeDoc golden-verification ticket (next) and the plgg-press build render; the JSON sidebar manifest (api/typedoc-sidebar.json) is kept for site.config.ts to import.
- **Insight**: typedoc output shape is tightly coupled to the parser; a typedoc minor bump can drift, but the plgg-press build fails loudly (renderMarkdown -> Err) rather than emitting broken HTML.
  **Context**: Acceptable for v1; list format lengthens some API pages, tunable in the theme later.
