---
created_at: 2026-06-30T01:35:07+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013500-ssg-discover-paths-copy-assets-404.md, 20260630013503-plgg-highlight-ts-scanner.md, 20260630013504-plgg-press-scaffold-siteconfig-cli.md, 20260630013505-plgg-press-theme-document-shell.md, 20260630013506-plgg-press-theme-nav-sidebar-home-callout.md]
---

# plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a generic static build (renders 404, asserts zero client JS)

## Overview

The plgg-native replacement for `vitepress build`, implemented as the body of build() and proven with a GENERIC fixture content dir (NO typedoc dependency — the guide/TypeDoc golden render-verification is a separate later ticket per items 10 & 20). An internal pressRouter (plgg-server Web) maps each discovered path to a handler that reads the .md file, runs renderMarkdownWith(asHighlighter(), href(base)), wraps the body via the theme shell (homeHero when layout==home), and returns htmlResponse(renderToString(page)) with collectCss inlined. build() calls Ssg.discoverPaths -> generateStatic(pressRouter) -> copyAssets + write404 (rendering the theme notFound view) into outDir. The CLI `plgg-press build` invokes build(). Dead-link checking is a separate ticket.

**Proof of value:** Running `plgg-press build` against a GENERIC fixture emits outDir/<path>/index.html for every discovered page + a 404.html rendered through the theme shell, with theme chrome + highlighted code and NO <script> tag anywhere — green under scripts/test-plgg-press.sh (package-local `npm run test`).

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

- Depends on [20260630013500-ssg-discover-paths-copy-assets-404.md](20260630013500-ssg-discover-paths-copy-assets-404.md) — Grow plgg-server/Ssg with discoverPaths, copyAssets, and write404 (colocated fs helpers, exported via the ssg entry NOT the neutral barrel)
- Depends on [20260630013503-plgg-highlight-ts-scanner.md](20260630013503-plgg-highlight-ts-scanner.md) — Create plgg-highlight: zero-dep TS/TSX syntax highlighting via ts.createScanner, with language-alias normalization
- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the facade — package, SiteConfig contract (incl. home data + allowedHosts), href helper, config-loading CLI (plgg-bundle TS hook), build()/dev() skeleton
- Depends on [20260630013505-plgg-press-theme-document-shell.md](20260630013505-plgg-press-theme-document-shell.md) — plgg-press theme (a): document shell + style injection (typed plgg-view shell builders, title from firstHeading)
- Depends on [20260630013506-plgg-press-theme-nav-sidebar-home-callout.md](20260630013506-plgg-press-theme-nav-sidebar-home-callout.md) — plgg-press theme (b): nav, CSS-only sidebar, generic home (SiteConfig data), callouts, and the 404 not-found view

## Implementation Steps

1. Implement packages/plgg-press/src/router pressRouter(contentDir, config, base): register one GET route per discovered path whose handler reads the source file, runs renderMarkdownWith(asHighlighter(), href(base)), selects homeHero(config.home) when frontmatter.layout==home else the markdown body, wraps via theme shell(config, doc, body), and returns htmlResponse(renderToString(page)).
2. Fill the build(opts) body composing with proc/pipe: Ssg.discoverPaths(contentDir) -> generateStatic(pressRouter)({paths, outDir}) -> Ssg.copyAssets(assetsDir)(outDir) -> Ssg.write404(outDir)(renderToString(notFound(config))); fold SsgError/Defect at the edge; thread opts.base into the theme + injected href.
3. Wire the CLI `plgg-press build` to use the loaded site.config + content dir (from the scaffold ticket) and call build().
4. Add a spec/driver that builds a tiny GENERIC fixture content dir end-to-end and asserts outDir/<path>/index.html + outDir/404.html exist with expected HTML (theme chrome + highlighted code + the 404 rendered through the shell). NO typedoc fixture here.
5. Assert the production zero-client-JS goal: every emitted file contains NO <script> tag and NO EventSource string (the dev-only live-reload is added ONLY in dev()).

## Considerations

- This ticket is GENERIC and fixture-driven (items 10 & 20): the premature typedoc-render assertion is REMOVED; golden render-verification against real typedoc output is the separate guide/TypeDoc ticket that depends on typedoc-drop + the guide config.
- The route-path convention from discoverPaths must match the handler's file-read mapping exactly, or pages 404 during the crawl.
- File reads happen inside plgg-press's own router handler (async PromisedResult) — acceptable node:fs use in the build tool, not the pure Ssg core.
- renderMarkdown returning Err for any page aborts the build via SsgError short-circuit — the desired loud failure.
- build() must emit ZERO client JS — assert no <script>/EventSource here; the 404 (item 14) is rendered via the theme notFound view and persisted by write404.
