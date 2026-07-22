---
created_at: 2026-07-23T00:40:20+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
depends_on: [20260723004000-adopt-plggmatic-column-layout.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# A persistent, self-owned dev server surface for plggpress

## Overview

`plggpress dev` today only *assembles a plan* and delegates the
watch/serve loop to plgg-bundle; the live-reload channel is
plgg-bundle's `EventSource`, not one plggpress controls, and plggpress
deliberately omits the `serveWeb`/`serve` persistent path (that lives
in `plgg-cms`). To host an edit bridge and a realtime assistant,
plggpress dev needs a **persistent, self-owned server surface** with a
client channel it controls, while keeping the file-watch hot reload.
This ticket adds that surface — no AI/editing yet, just the persistent
server + controlled client channel foundation.

## Key files

- `packages/plggpress/src/devEntry.ts:43` (`pressDevEntry`),
  `src/devServerEntry.ts` — the dev render factory and re-imported
  module.
- `packages/plggpress/src/framework/Dev/` (`devPlan.ts`,
  `node/devSeam.ts:78` `runDev`) — the plgg-bundle delegation seam.
- `packages/plggpress/src/framework/Cli/usecase/runApp.ts:372` — the
  `dev` command registration and flags.
- `packages/plgg-cms` `serveWeb`/`serve` — prior art for a persistent
  `node:http` server surface built on plgg-server.
- `packages/plgg-poc4c-livesite/` — prior art for a dev server that
  owns its own reload/patch client channel.

## Approach

- Stand up a persistent server surface for `plggpress dev` (reusing
  the plgg-server/plgg-http stack, following the plgg-cms `serveWeb`
  shape) that serves the rendered pages AND a plggpress-owned client
  channel (SSE/websocket) for reload + future edit/assistant events.
- Preserve file-watch hot reload: an edit to a source file reloads the
  affected page through the plggpress-owned channel without dropping
  it (the channel must survive a rebuild, unlike a full re-import).
- Keep the static `build` path untouched; the persistent surface is
  dev-only and must never leak into production output (the existing
  `build.spec.ts` no-EventSource-in-prod assertion stays green).

## Quality Gate

- **Acceptance:** a spec/integration check starts `plggpress dev`,
  connects to the plggpress-owned client channel, edits a source file,
  and asserts the page reloads while the channel stays connected. The
  `build` output contains no dev channel client.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:operation` — the dev server keeps serving across edits;
  the client channel self-heals, the session is not dropped by a
  rebuild.
- `workaholic:implementation` / recoverability — reuse the plgg-cms
  `serveWeb` seam rather than a bespoke server; dev-only, no prod leak.
