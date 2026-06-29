---
created_at: 2026-06-30T01:35:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013500-ssg-discover-paths-copy-assets-404.md, 20260630013503-plgg-highlight-ts-scanner.md, 20260630013504-plgg-press-scaffold-siteconfig-cli.md, 20260630013505-plgg-press-default-theme.md]
---

# plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a static build

## Overview

The plgg-native replacement for `vitepress build`, MOVED into plgg-press and implemented as the body of build(). An internal pressRouter (plgg-server Web) maps each discovered path to a handler that reads the .md file, runs renderMarkdownWith(asHighlighter(), href(base)), wraps the body via the theme shell (homeHero when layout==home), and returns htmlResponse(renderToString(page)) with collectCss inlined. build() calls Ssg.discoverPaths -> generateStatic(pressRouter) -> copyAssets + write404 into outDir. This ticket fills the build() stub from ticket 7 AND performs the deferred render-verification of the theme-less typedoc output against the spike golden snapshots. The CLI `plgg-press build` invokes build(). Dead-link checking is split into ticket 10.

**Proof of value:** Running `plgg-press build` against a fixture (and the real guide after docs:api) emits outDir/<path>/index.html for every discovered page + 404.html with theme chrome + highlighted code and NO <script> tag, and sampled API pages match the ticket-1 golden snapshots — green under scripts/test-plgg-press.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — build pipeline placement under packages/plgg-press/src
- `workaholic:implementation` / `policies/coding-standards.md` — proc/pipe data-last pipeline, Result not throw, printWidth 50
- `workaholic:implementation` / `policies/functional-programming.md` — the build is one typed transform pipeline over Result/SsgError
- `workaholic:implementation` / `policies/vendor-neutrality.md` — build runs via plgg-bundle / Node type-stripping, no vite; consumes only plgg-family deps

## Key Files

- `/home/ec2-user/projects/plgg/packages/example/src/build.ts` - concrete pattern: generateStatic(app)({paths, outDir}) static emit
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` - generateStatic/renderRoutes crawl each path via synthetic GET; the handler returns htmlResponse
- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Routing/model/Web.ts` - web/get/route constructors to build pressRouter
- `/home/ec2-user/projects/plgg/packages/plgg-http/src/Http/model/HttpResponse.ts` - htmlResponse builder for the rendered page string

## Dependencies

- Depends on [20260630013500-ssg-discover-paths-copy-assets-404.md](20260630013500-ssg-discover-paths-copy-assets-404.md) — Grow plgg-server/Ssg with discoverPaths, copyAssets, and 404.html emission
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner
- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the VitePress-like facade — package, SiteConfig contract, href helper, build()/dev() API + CLI skeleton
- Depends on [20260630013505-plgg-press-default-theme.md](20260630013505-plgg-press-default-theme.md) — plgg-press default theme: shell, nav, sidebar, home, callout, title-from-H1 (plgg-view view-functions)

## Implementation Steps

1. Implement packages/plgg-press/src/router pressRouter(contentDir, config, base): register one GET route per discovered path whose handler reads the source file, runs renderMarkdownWith(asHighlighter(), href(base)), selects homeHero when frontmatter.layout==home else the markdown body, wraps via theme shell(config, page, body), and returns htmlResponse(renderToString(page)).
2. Fill the build(opts) body (from ticket 7) composing with proc/pipe: Ssg.discoverPaths(contentDir) -> generateStatic(pressRouter)({paths, outDir}) -> Ssg.copyAssets(assetsDir)(outDir) -> Ssg.write404(outDir)(rendered404); fold SsgError/Defect at the edge; thread opts.base into the theme + injected href.
3. Wire the CLI `plgg-press build` (ticket 7's cli.ts) to load the consumer's site.config + content dir and call build().
4. Render-verify the typedoc output: provide a fixture/driver that runs against regenerated API pages and diffs rendered HTML against the ticket-1 golden snapshots for parity (this is the verification deferred from the typedoc-drop ticket).
5. Add a spec/driver that builds a tiny fixture content dir end-to-end and asserts outDir/<path>/index.html + outDir/404.html exist with expected HTML (theme chrome + highlighted code).
6. Run build() against the real guide content (after gen-api) and confirm every discovered page emits with NO <script> tag in any output (production zero-client-JS assertion).

## Considerations

- The route-path convention from discoverPaths (ticket 3) must match the handler's file-read mapping exactly, or pages 404 during the crawl.
- File reads happen inside plgg-press's own router handler (async PromisedResult) — acceptable node:fs use in the build tool, not the pure Ssg core.
- renderMarkdown returning Err for any page aborts the build via SsgError short-circuit — the desired loud failure on typedoc drift.
- build() must emit ZERO client JS — assert no <script> in output here; the dev-only live-reload script is added ONLY in dev() (ticket 11).
