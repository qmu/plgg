---
created_at: 2026-06-30T01:35:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash: 5917685
category: Changed
depends_on: [20260630013504-plgg-press-scaffold-siteconfig-cli.md, 20260630013507-plgg-press-build-pipeline.md]
---

# plgg-press dev(): node:http + fs.watch rebuild, allowedHosts from PressOptions, and DEV-ONLY SSE live-reload

## Overview

The plgg-native replacement for `vitepress dev`, implemented as the body of dev(). It runs the same pressRouter over plgg-server's node:http serve() adapter, with an explicit Host allowlist sourced from PressOptions/SiteConfig.dev.allowedHosts (item 7 — the guide sets it for the plgg-guide.qmu.dev Cloudflare tunnel) and an fs.watch -> debounced in-process re-render loop. Same render path as the static build (no SSR flash, no second code path). ADDS DEV-ONLY live-reload: an SSE endpoint on the node:http dev server that fires after each fs.watch rebuild, plus a ~5-line injected <script> calling location.reload() on the SSE message. The script is injected ONLY in dev mode and is STRIPPED from production `build` output — this is live-reload, NOT HMR. The CLI `plgg-press dev` invokes dev().

**Proof of value:** Running `plgg-press dev` starts a node:http server serving the rendered guide with a single injected live-reload <script>; editing a .md file triggers an fs.watch rebuild and an SSE 'reload' event that reloads the page; a Host outside SiteConfig.dev.allowedHosts gets 403; a spec asserts the production build render path emits no <script>/EventSource — green under scripts/test-plgg-press.sh (package-local `npm run test`).

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — dev server placement under packages/plgg-press/src
- `workaholic:implementation` / `policies/coding-standards.md` — node:http confined to one seam, Option/Result style, printWidth 50
- `workaholic:implementation` / `policies/vendor-neutrality.md` — reuse plgg-server serve() + node:http; no vite dev server, no new dep; SSE is a native-browser API, no client lib

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Serving/usecase/serve.ts` - node:http adapter: serve(options)(handler) returns a Server; used to host pressRouter in dev
- `/home/ec2-user/projects/plgg/packages/example/src/serve.ts` - reference fs.watch rebuild-on-change dev pattern (node:http + watch) without vite
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/dev.ts` - the dev() stub from the scaffold ticket whose body this ticket fills
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/SiteConfig/model` - SiteConfig.dev.allowedHosts / PressOptions.allowedHosts consumed for the Host allowlist

## Dependencies

- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the facade — package, SiteConfig contract (incl. home data + allowedHosts), href helper, config-loading CLI (plgg-bundle TS hook), build()/dev() skeleton
- Depends on [20260630013507-plgg-press-build-pipeline.md](20260630013507-plgg-press-build-pipeline.md) — plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a generic static build (renders 404, asserts zero client JS)

## Implementation Steps

1. Fill dev(opts) (the scaffold stub): build pressRouter(contentDir, config, base='/') and host it via plgg-server serve({port})(handle(pressRouter)).
2. Add a Host-header allowlist check in the handler (or a thin wrapping middleware) sourced from PressOptions/SiteConfig.dev.allowedHosts (localhost + the guide's plgg-guide.qmu.dev), returning 403 for disallowed hosts (item 7).
3. Add an fs.watch on the content tree (debounced) that re-runs the in-process render for changed paths.
4. Add the DEV-ONLY live-reload: an SSE endpoint (GET /__press_reload, Content-Type text/event-stream, keep-alive) that pushes a 'reload' event after each debounced rebuild; in the shell render path, when a dev flag is set, append a ~5-line <script> opening an EventSource('/__press_reload') whose onmessage calls location.reload(). Gate injection STRICTLY behind the dev flag so build() never emits it.
5. Confirm the dev server renders the same Html<never> -> renderToString output as the static build PLUS the dev-only script; assert (test) that the production render path emits NO script and NO EventSource string, while the dev render path emits exactly one.
6. Wire the CLI `plgg-press dev`; document the run command for serve-guide.sh / the dev container.

## Considerations

- Full re-render per change is acceptable for dev on a small site.
- allowedHosts now comes from PressOptions/SiteConfig (item 7), preserving the tunnel-safety VitePress gave; the guide instance supplies plgg-guide.qmu.dev.
- The dev-only script MUST be provably absent from production output — the dev flag gating is the one place client JS exists. This is live-reload, NOT HMR.
- Keep node:http confined to this seam; the render path stays shared with build().

## Final Report

Development completed as planned. dev() hosts pressRouter over plgg-server's node:http serve() with a Host allowlist, debounced fs.watch rebuild, and a dev-only SSE live-reload. Verified: tsc clean; build dts; 78 passed/0 failed; coverage 99.15/92.75/96/99.15; the EventSource/script literal exists ONLY in dev.ts; no as/any/ts-ignore.

### Discovered Insights

- **Insight**: The live-reload <script> is string-appended before </body> by decorateDevHtml INSIDE the dev seam only (renderToString escapes text nodes, so a <script> can't go through the typed tree). build()/pressRouter never reference it, so "production emits no client JS" is structurally guaranteed (the literal is only in dev.ts:70). Tests assert prod=0, dev=exactly 1.
  **Context**: This is the one place client JS exists; it is live-reload (full reload), not HMR.
- **Insight**: The testable core is createDevHandle(opts) -> {fetch, rebuild, clients} (no port, no watcher), so specs exercise host-403/SSE/rebuild without binding a socket. rebuild() hot-swaps the pressRouter and pushes a 'reload' SSE frame; a transient discovery miss keeps the last good router.
  **Context**: allowedHosts comes from SiteConfig.dev.allowedHosts (guide adds plgg-guide.qmu.dev). Run command: `PORT=5181 plgg-press dev --config site.config.ts --contentDir docs`.
- **Insight**: A top-level `new TextEncoder()` broke the build — plgg-bundle's export-surface eval has no platform globals; defer such instantiations into a function (encodeUtf8).
  **Context**: A plgg-bundle build-time gotcha for any package using platform globals at module scope.
