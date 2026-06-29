---
created_at: 2026-06-30T01:35:07+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013501-plgg-md-inline-fold-to-html.md, 20260630013502-plgg-highlight-ts-scanner.md, 20260630013503-ssg-discover-paths-copy-assets-404.md, 20260630013506-guide-theme-plgg-view.md]
---

# Guide build.ts + guideRouter: wire parse→highlight→theme→Ssg into a static build

## Overview

The plgg-native replacement for `vitepress build`. A guideRouter (plgg-server Web) maps each discovered path to a handler that reads the .md file, runs renderMarkdownWith(asHighlighter, base), wraps the body via the theme shell (homeHero when layout==home), and returns htmlResponse(renderToString(page)) with collectCss inlined. build.ts calls Ssg.discoverPaths → generateStatic(guideRouter) → copyAssets + write404 into dist/. This ticket also performs the deferred render-verification of the theme-less typedoc output against the spike golden snapshots. Dead-link checking is split into ticket 11.

**Proof of value:** Running build.ts against a fixture (and the real guide after docs:api) emits dist/<path>/index.html for every discovered page + dist/404.html with theme chrome + highlighted code, and sampled API pages match the ticket-1 golden snapshots.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — build tool placement under packages/guide/src
- `workaholic:implementation` / `policies/coding-standards.md` — proc/pipe data-last pipeline, Result not throw, printWidth 50
- `workaholic:implementation` / `policies/functional-programming.md` — the build is one typed transform pipeline over Result/SsgError
- `workaholic:implementation` / `policies/vendor-neutrality.md` — build runs via Node type-stripping/plgg-bundle, no vite; consumes only plgg-family deps

## Key Files

- `/home/ec2-user/projects/plgg/packages/example/src/build.ts` - concrete pattern: generateStatic(app)({paths, outDir}) static emit
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` - generateStatic/renderRoutes crawl each path via synthetic GET; the handler returns htmlResponse (SoftStr body accepted by toPage)
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Routing/model/Web.ts` - web/get/route constructors to build guideRouter
- `/home/ec2-user/projects/plgg/packages/plgg-http/src/Http/model/HttpResponse.ts` - htmlResponse builder for the rendered page string

## Dependencies

- Depends on [20260630013501-plgg-md-inline-fold-to-html.md](20260630013501-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, Highlighter seam, anchor-parity slugs, and AST→Html<never> fold (renderMarkdown)
- Depends on [20260630013502-plgg-highlight-ts-scanner.md](20260630013502-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner
- Depends on [20260630013503-ssg-discover-paths-copy-assets-404.md](20260630013503-ssg-discover-paths-copy-assets-404.md) — Grow plgg-server/Ssg with discoverPaths, copyAssets, and 404.html emission
- Depends on [20260630013506-guide-theme-plgg-view.md](20260630013506-guide-theme-plgg-view.md) — Build the guide theme as plgg-view view-functions (shell, nav, sidebar, home, callout, title-from-H1)

## Implementation Steps

1. Create packages/guide/src/build.ts and a guideRouter(contentDir, config, base) module: register one GET route per discovered path whose handler reads the source file, runs renderMarkdownWith(asHighlighter(), base), selects homeHero when frontmatter.layout==home else the markdown body, wraps via theme shell(config, page, body), and returns htmlResponse(renderToString(page)).
2. In build.ts compose with proc/pipe: Ssg.discoverPaths(contentDir) → generateStatic(guideRouter)({paths, outDir:'dist'}) → Ssg.copyAssets(assetsDir)('dist') → Ssg.write404('dist')(rendered404); fold SsgError/Defect at the edge.
3. Thread DOCS_BASE through config.base into the theme + markdown href helper.
4. Render-verify the typedoc output: run docs:api then build, and spot-render a couple of regenerated API pages, diffing rendered HTML against the ticket-1 golden snapshots for parity (this is the verification deferred from ticket 7).
5. Add a spec/driver that builds a tiny fixture content dir end-to-end and asserts dist/<path>/index.html + dist/404.html exist with expected HTML.
6. Run the build against the real guide content and confirm every discovered page emits.

## Considerations

- The route-path convention from discoverPaths (ticket 6) must match the handler's file-read mapping exactly, or pages 404 during the crawl.
- File reads happen inside the guide's own router handler (async PromisedResult) — acceptable node:fs use in the guide build tool, not the pure Ssg core.
- renderMarkdown returning Err for any page aborts the build via SsgError short-circuit — the desired loud failure on typedoc drift.
