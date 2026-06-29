---
created_at: 2026-06-30T01:35:08+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013506-plgg-press-build-pipeline.md]
---

# plgg-press dev(): node:http + fs.watch rebuild, Host allowlist, and DEV-ONLY SSE live-reload

## Overview

The plgg-native replacement for `vitepress dev`, MOVED into plgg-press as the body of dev(). It runs the same pressRouter over plgg-server's node:http serve() adapter, with an explicit Host allowlist mirroring VitePress allowedHosts (for the plgg-guide.qmu.dev Cloudflare tunnel) and an fs.watch -> debounced in-process re-render loop. Same render path as the static build (no SSR flash, no second code path). ADDS DEV-ONLY live-reload: an SSE endpoint on the node:http dev server that fires after each fs.watch rebuild, plus a ~5-line injected <script> calling location.reload() on the SSE message. The script is injected ONLY in dev mode and is STRIPPED from production `build` output — this is live-reload (full reload after rebuild), NOT HMR, which is impossible with zero client runtime. The CLI `plgg-press dev` invokes dev().

**Proof of value:** Running `plgg-press dev` starts a node:http server serving the rendered guide with a single injected live-reload <script>; editing a .md file triggers an fs.watch rebuild and an SSE 'reload' event that reloads the page; a disallowed Host gets 403; a spec asserts the production build render path emits no <script>/EventSource — green under scripts/test-plgg-press.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — dev server placement under packages/plgg-press/src
- `workaholic:implementation` / `policies/coding-standards.md` — node:http confined to one seam, Option/Result style, printWidth 50
- `workaholic:implementation` / `policies/vendor-neutrality.md` — reuse plgg-server serve() + node:http; no vite dev server, no new dep; SSE is a native-browser API, no client lib

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-server/src/Serving/usecase/serve.ts` - node:http adapter: serve(options)(handler) returns a Server; used to host pressRouter in dev
- `/home/ec2-user/projects/plgg/packages/example/src/serve.ts` - reference fs.watch rebuild-on-change dev pattern (node:http + watch + spawnSync) without vite
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/dev.ts` - the dev() stub from ticket 7 whose body this ticket fills
- `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` - source of the allowedHosts value (plgg-guide.qmu.dev) to mirror at the node:http layer

## Dependencies

- Depends on [20260630013506-plgg-press-build-pipeline.md](20260630013506-plgg-press-build-pipeline.md) — plgg-press build(): wire discoverPaths -> renderMarkdown -> highlight -> theme -> Ssg into a static build

## Implementation Steps

1. Fill dev(opts) (the ticket-7 stub): build pressRouter(contentDir, config, base='/') and host it via plgg-server serve({port})(handle(pressRouter)).
2. Add a Host-header allowlist check in the handler (or a thin wrapping middleware) mirroring vite's allowedHosts (localhost + plgg-guide.qmu.dev), returning 403 for disallowed hosts.
3. Add an fs.watch on the content tree (debounced) that re-runs the in-process render for changed paths.
4. Add the DEV-ONLY live-reload: an SSE endpoint (e.g. GET /__press_reload using node:http res with Content-Type text/event-stream, keep-alive) that pushes a 'reload' event after each debounced rebuild; in the shell render path, when a dev flag is set, append a ~5-line <script> opening an EventSource('/__press_reload') whose onmessage calls location.reload(). Gate injection STRICTLY behind the dev flag so build() (ticket 9) never emits it.
5. Confirm the dev server renders the same Html<never> -> renderToString output as the static build PLUS the dev-only script; assert (test) that the production render path emits NO script and NO EventSource string, while the dev render path emits exactly one.
6. Wire the CLI `plgg-press dev`; document the run command for serve-guide.sh / the dev container (ticket 16).

## Considerations

- Full re-render per change is acceptable for dev on a small site.
- node:http needs no allowedHosts config, but the explicit Host allowlist preserves the tunnel-safety VitePress gave.
- The dev-only script MUST be provably absent from production output — this is the one place client JS exists, and the zero-client-JS production goal depends on the dev flag gating. This is live-reload, NOT HMR.
- Keep node:http confined to this seam; the render path stays shared with build().
