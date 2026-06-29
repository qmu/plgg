---
created_at: 2026-06-30T01:35:09+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort:
commit_hash:
category:
depends_on: [20260630013458-md-corpus-spike-and-decisions.md]
---

# Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest

## Overview

Remove typedoc-vitepress-theme from the typedoc plugin list (keeping typedoc-plugin-markdown), flatten output (parametersFormat/indexFormat -> list) toward the shape plgg-md handles best, and rewire gen-api.mjs so its emitted per-package API sidebar manifest is consumed by the new plgg-press-typed site config rather than VitePress. Normalize any out-of-subset construct the spike flagged. This is the keep-typedoc/drop-theme decision made concrete; the render-verification of the output is performed in plgg-press's build ticket (which has renderMarkdown available). typedoc stays a guide build devDep and is NOT folded into plgg-press.

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

- Depends on [20260630013458-md-corpus-spike-and-decisions.md](20260630013458-md-corpus-spike-and-decisions.md) — Spike: inventory the Markdown corpus, regenerate typedoc theme-less, and RECORD the grammar/slug/hero decisions

## Implementation Steps

1. Edit typedoc.base.json: remove 'typedoc-vitepress-theme' from the plugin array (leave 'typedoc-plugin-markdown'); switch parametersFormat and indexFormat from 'table' to 'list' per the spike findings.
2. In gen-api.mjs, remove logic that assumed the vitepress theme; keep the existing per-package compaction/sub-table stripping and the sidebar manifest emission, reshaping it into the plain manifest site.config.ts will import (keep JSON shape for minimal diff).
3. Run `npm run docs:api` and verify the regenerated api/<pkg>/*.md stays within plgg-md's subset; add a normalization pass for any residual raw HTML / unsupported construct the spike flagged.
4. Confirm api/ output and the manifest remain gitignored as before; do NOT remove vitepress itself here (ticket 15).

## Considerations

- Tight coupling between typedoc output shape and the parser: a typedoc minor bump can drift; the build later fails loudly (renderMarkdown -> Err) rather than emitting broken HTML.
- Flattening to 'list' may lengthen some API pages; acceptable for v1, tunable in the theme.
- The plgg-md render-verification of regenerated pages is intentionally deferred to ticket 9 (which has renderMarkdown), so this ticket depends only on the spike.
