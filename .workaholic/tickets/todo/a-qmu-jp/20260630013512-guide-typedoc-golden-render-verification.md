---
created_at: 2026-06-30T01:35:12+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013507-plgg-press-build-pipeline.md, 20260630013510-typedoc-drop-theme-emit-manifest.md, 20260630013511-guide-site-config-instance.md]
---

# Guide/TypeDoc golden render-verification: diff plgg-press-rendered API pages against the spike snapshots

## Overview

The render-VERIFICATION deferred out of the generic build ticket (items 10 & 20): a guide-side check that runs `docs:api` (theme-less typedoc) then renders the regenerated API Markdown through the real plgg-press build pipeline and diffs the resulting HTML against the ticket-1 golden snapshots for acceptable parity. This is the loud failure point for typedoc-markdown drift. It depends on the typedoc-theme-drop, the guide site.config instance, and the build pipeline — it is intentionally NOT part of the generic build ticket, which stays typedoc-free.

**Proof of value:** Running the verification: `docs:api` + plgg-press render of sampled API pages diffs clean against the ticket-1 golden snapshots, and an intentionally drifted page fails the check loudly.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — verification driver/fixtures live with the guide build scripts, not in the generic packages
- `workaholic:implementation` / `policies/coding-standards.md` — Result not throw, data-last pipeline, printWidth 50
- `workaholic:implementation` / `policies/test.md` — the golden-parity assertion is a tested gate
- `workaholic:operation` / `policies/ci-cd.md` — this verification is the drift gate the deploy build relies on

## Key Files

- `/home/ec2-user/projects/plgg/packages/guide/scripts/gen-api.mjs` - produces the theme-less API Markdown the verification renders
- `/home/ec2-user/projects/plgg/packages/guide/site.config.ts` - the guide config the build pipeline uses to render API pages
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/build.ts` - the build pipeline whose render output is diffed against golden snapshots

## Dependencies

- Depends on [20260630013507-plgg-press-build-pipeline.md](20260630013507-plgg-press-build-pipeline.md) — plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a generic static build (renders 404, asserts zero client JS)
- Depends on [20260630013510-typedoc-drop-theme-emit-manifest.md](20260630013510-typedoc-drop-theme-emit-manifest.md) — Drop typedoc-vitepress-theme from typedoc config; keep markdown + emit a plain sidebar manifest
- Depends on [20260630013511-guide-site-config-instance.md](20260630013511-guide-site-config-instance.md) — Guide: add the typed site.config.ts INSTANCE (home data + allowedHosts; thin consumer of plgg-press SiteConfig)

## Implementation Steps

1. Run `npm run docs:api` to regenerate the theme-less API Markdown.
2. Render sampled API pages through the plgg-press build pipeline (using the guide site.config) and capture the emitted HTML.
3. Diff the rendered HTML against the ticket-1 golden snapshots; assert acceptable parity (link forms, anchors, no injected raw HTML) and fail loudly on drift.
4. Record the verification as a guide-side check (script + assertion) so a typedoc bump that breaks parity fails before deploy.

## Considerations

- This is the verification deliberately split out of the generic build ticket (items 10 & 20) so the generic pipeline has no typedoc coupling.
- Golden snapshots come from the spike; if intentional output changes are made, the snapshots must be re-blessed deliberately.
- Loud failure on drift is the goal — a typedoc minor bump should break this check, not silently ship broken API HTML.
