---
created_at: 2026-07-12T15:22:50+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Infrastructure]
effort:
commit_hash: 1fcb6c4e
category: Added
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 4: agent file edits with live hot reload over a surviving Realtime session

## Overview

The mission's PoC 4 (`pocs.ts` poc4, port 5187, `plgg-poc4.qmu.dev`, status
`planned`): can a browser agent's tool calls edit local doc files through the
dev server while hot reload refreshes the page WITHOUT dropping the realtime
session? Confidence signal (already recorded on the portal): *an
agent-initiated edit lands on disk, the edited page hot-reloads, and the same
realtime session continues the conversation uninterrupted.*

This round extends PoC 3's proven voice loop with four new surfaces:

1. **The corpus is the plgg guide, served by plggpress dev mode** — the doc
   pages the writer discusses are rendered by `pressDevEntry` → `pressRouter`
   under plgg-bundle's dev server (real hot reload), not hand-rolled static
   files.
2. **An `edit_file` tool next to `search_docs`** — the model edits the open
   document; the write goes through a server seam onto disk.
3. **BOTH voice and text** — the mic path from PoC 3 plus a typed input that
   sends `conversation.item.create` (input_text) + `response.create` over the
   same data channel.
4. **Session-surviving reload** — decided at ticket time: **iframe
   isolation**. The session-bearing shell (voice/text UI, transcript, tool
   trail) is its own page WITHOUT the live-reload script; the plggpress-served
   doc page lives in an iframe that hot-reloads freely.

Two decisions locked with the developer (2026-07-12):

- **Reload strategy: iframe isolation** (not DOM-morphing, not session
  persistence). plgg-bundle's `LIVE_RELOAD_SCRIPT` does `location.reload()`,
  which would tear down the module-level WebRTC state in
  `vendors/realtime.ts`; the iframe confines that reload to the doc preview.
- **The agent edits a COPY of the guide docs** — a git-ignored, build-seeded
  copy of `packages/guide`'s markdown inside the PoC package. The real guide
  never accumulates uncommitted AI edits; reset = re-seed.

Architecture (one container, two processes on the pattern of
`workloads/guide/dev-entrypoint.sh` + `workloads/poc3-voice/compose.yaml`):

- **Shell server** (poc3-style thin `node:http` entrypoint, public port,
  container 5173 → host 5187): serves the session shell bundle no-store,
  `POST /api/session` (plgg-kit `minterFromConfig`, honest 404 keyless),
  `POST /api/edit` (the confined write seam), and **proxies everything under
  `/docs/` — including the `/__plgg_reload` SSE stream — to the internal
  plggpress dev port** so the iframe stays same-origin behind the single
  tunnel hostname.
- **plggpress dev** (plgg-bundle dev on an internal port, e.g. 5175): a
  PoC-local `bundle.config.ts` + devEntry over the copied corpus dir, watch
  roots including that dir, so an agent write triggers `shouldReload`
  (content `.md` always reloads) and only the iframe refreshes.

## Policies

The standard engineering policies this ticket answers to. The implementing
session MUST read each hard copy before writing code.

- `workaholic:implementation` / `policies/directory-structure.md` — new
  package `packages/plgg-poc4-edit` + `workloads/poc4-edit/compose.yaml`,
  same shape as the poc3 scaffold; no new top-level dirs.
- `workaholic:implementation` / `policies/coding-standards.md` — house style:
  no `as`/`any`/`ts-ignore`, Option/Result, exhaustive `match`, unknown
  validated inward at every boundary (`/api/edit` body, vendor events).
- `workaholic:design` / `policies/defense-in-depth.md` — the AI file-write
  HTTP seam is the central risk: closed by default, allowlisted content root
  only (reject traversal / absolute paths / symlink escape), `.md`-only
  extension whitelist, layered so no single loose check exposes the host fs.
- `workaholic:design` / `policies/access-control.md` — the write
  authorization lives in ONE authoritative pure function (path-scope +
  method guard), not scattered across handler / executor / fs calls.
- `workaholic:design` / `policies/self-explanatory-ui.md` — design all
  states: keyless (honest banner), edit landed (which file, visible
  confirmation), iframe reloaded, session-still-live indicator, actionable
  errors ("couldn't write X — outside the content root").
- `workaholic:design` / `policies/vendor-neutrality.md` — OpenAI Realtime
  stays behind the plgg-kit mint + `vendors/realtime.ts` seams; the standing
  key never reaches the browser; zero new dependencies.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — path
  validation, edit application, tool schemas, event decoding are pure total
  functions tested offline; `fs`/`http`/WebRTC live only in
  `entrypoints/`+`vendors/`.
- `workaholic:implementation` / `policies/test.md` — >90% coverage on the
  pure core; the path-validation boundary is exhaustively tested; prefer
  `proc` over isErr-guard chains.
- `workaholic:implementation` / `policies/objective-documentation.md` — the
  eventual verdict states measured facts; module headers describe actual
  routes/behavior; the content-root confinement decision documented inline.
- `workaholic:operation` / `policies/command-scripts.md` — reuse
  `scripts/serve-poc.sh poc4-edit`; add `scripts/test-plgg-poc4-edit.sh`
  mirroring the existing naming; no bespoke runners.

## Key Files

- `packages/plgg-poc3-voice/src/agent.ts` - the pure agent core to extend:
  `SEARCH_TOOL`, `runSearchTool`, `instructionsOf`, `eventOf` (the
  `response.function_call_arguments.done` gate currently pinned to
  `search_docs` must generalize to `edit_file`)
- `packages/plgg-poc3-voice/src/app.ts` - the TEA program; `edit_file` needs
  a server round-trip effect (POST /api/edit) unlike the in-browser
  `runSearchTool`; the text-input path lands here too
- `packages/plgg-poc3-voice/src/vendors/realtime.ts` - WebRTC seam; a text
  turn = `conversation.item.create` + `response.create` frames; module-level
  `live` state is why the shell must never reload
- `packages/plgg-poc3-voice/src/entrypoints/serve.ts` - the mint-seam server
  to clone for the shell (plgg-kit `minterFromConfig`, honest 404/502,
  no-store)
- `packages/plgg-bundle/src/Dev/model/Protocol.ts` - `LIVE_RELOAD_SCRIPT` =
  `location.reload()` on the `/__plgg_reload` SSE frame — the reload the
  iframe confines
- `packages/plgg-bundle/src/Dev/usecase/reloadDecision.ts` - content `.md`
  changes ALWAYS reload — the free edit→reload chain
- `packages/plgg-bundle/src/Dev/node/devServer.ts` - `/api` routes cannot
  live in the dev server; non-reload traffic flows through the app Fetch —
  hence the separate shell server + proxy
- `packages/plggpress/src/devEntry.ts` - `pressDevEntry` the internal doc
  server runs
- `packages/guide/bundle.config.ts` - dev-config template (port, watch,
  allowedHosts)
- `workloads/guide/dev-entrypoint.sh`, `workloads/guide/Dockerfile` - the
  container recipe for a plggpress dev server (sibling dist build + npm run
  dev)
- `workloads/poc3-voice/compose.yaml` - fleet compose template
  (`OPENAI_API_KEY: ${OPENAI_API_KEY:-}` passthrough, host 5187→5173)
- `packages/plgg-cms/src/editing/exportFs.ts` - the atomic-write pattern
  (temp + rename) the edit executor mirrors so hot reload never reads a torn
  file
- `packages/plgg-poc-portal/src/pocs.ts` - the poc4 entry the CONCLUDING
  ticket flips (status building now; verdict at judging — keep
  `pocConsistent` green)
- `packages/plgg-poc-portal/README.md` - cloudflared ingress convention
  (developer-applied `~/.cloudflared/config.yml` line)

## Related History

The fleet plan reserved PoC 4 exactly as requested here, and every reusable
piece exists on main: PoC 3's Realtime agent loop, plgg-kit's GA minter, and
plggpress/plgg-bundle's dev hot-reload.

- [20260711035317-plggpress-poc-portal-and-plan.md](.workaholic/tickets/archive/work-20260711-035119/20260711035317-plggpress-poc-portal-and-plan.md) - founding fleet ticket; reserved poc4 = agent file edits + hot reload, port/hostname map (same mission)
- [20260712030000-poc3-writer-voice-assistant.md](.workaholic/tickets/archive/work-20260712-003840/20260712030000-poc3-writer-voice-assistant.md) - the scaffold this PoC extends: Realtime session, search_docs loop, trail UI, fleet wiring (nearest template)
- [20260712113318-resume-poc3-verdict-and-ship.md](.workaholic/tickets/archive/work-20260712-003840/20260712113318-resume-poc3-verdict-and-ship.md) - PoC 3 proven; GA endpoints, container key-preservation gotcha, no-store serving findings (operational context)
- [20260712040000-plgg-kit-realtime-ga-migration.md](.workaholic/tickets/archive/work-20260712-003840/20260712040000-plgg-kit-realtime-ga-migration.md) - the canonical GA client_secrets mint this PoC reuses (same seam)
- [20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md](.workaholic/tickets/archive/work-20260701-185044/20260702041500-plgg-bundle-dev-server-module-runner-hot-reload.md) - the hot-reload engine (same mechanism)
- [20260630013509-plgg-press-dev-server-live-reload.md](.workaholic/tickets/archive/work-20260630-013457/20260630013509-plgg-press-dev-server-live-reload.md) - plggpress dev + fs.watch + SSE live reload (same mechanism)
- [20260711201840-poc2-reader-side-browser-agent.md](.workaholic/tickets/archive/work-20260711-201840/20260711201840-poc2-reader-side-browser-agent.md) - the FTS index + serve recipe reused for search_docs over the guide corpus (same pattern)

## Implementation Steps

1. **Scaffold `packages/plgg-poc4-edit`** on the poc3 shape (deps: plgg,
   plgg-kit, plgg-view, plgg-poc1-search; devDeps: plgg-bundle, plgg-test,
   typescript; scaffold gotchas per memory: no `type: module` deviation from
   poc3 — copy poc3's package.json shape verbatim, plgg-test.config.json,
   tsconfig without rootDir + allowImportingTsExtensions). Flip portal poc4
   → `building` (keeps `pocConsistent` green; `isLinkable` lights the link).
2. **Corpus copy + index**: a build step seeds `content/` (git-ignored) from
   `packages/guide`'s markdown; `buildIndex.ts` (poc3 recipe) builds
   `dist/index/fts.json` over the COPY. `npm run reset-content` re-seeds.
3. **Pure edit core** (`src/edit.ts` + spec): `EDIT_TOOL` schema
   (`edit_file(path, content)`), `resolveEditPath` — the single authoritative
   guard: relative path only, resolves inside the content root, `.md` only,
   rejects traversal/absolute/symlink escape as typed errors; pure edit
   application. Exhaustive spec (the security boundary).
4. **Agent core extension**: generalize poc3's `eventOf` function-call gate
   to `search_docs` | `edit_file`; `instructionsOf` gains the edit-capable
   instruction (edit the open document when asked; confirm what changed).
   Reuse `runSearchTool` over the copy-corpus index.
5. **Shell server** (`entrypoints/serve.ts`): clone poc3's mint seam
   (plgg-kit `minterFromConfig`, GA `client_secrets`, honest 404/502,
   no-store) + `POST /api/edit` (validate body inward, `resolveEditPath`,
   atomic write per `exportFs` pattern, then rebuild the FTS index
   in-process so search stays fresh) + reverse-proxy `/docs/*` and
   `/__plgg_reload` to the internal plggpress dev port (stream-safe pipe;
   SSE must not buffer).
6. **plggpress dev wiring**: PoC-local `bundle.config.ts` + devEntry serving
   the content copy on the internal port; watch roots include `content/` so
   an agent write hot-reloads the doc page. allowedHosts:
   `plgg-poc4.qmu.dev`, localhost.
7. **Shell UI** (`src/app.ts`/`view.ts` on poc3's TEA shape): voice controls
   + transcript + tool trail from poc3, PLUS a text input (sends
   `conversation.item.create` input_text + `response.create`), an edit trail
   (file, confirmation, error states), a session-live indicator, and the doc
   preview iframe pointed at `/docs/...`. `edit_file` tool calls round-trip
   through `POST /api/edit` and reply via `sendToolOutput`.
8. **Fleet wiring**: `workloads/poc4-edit/compose.yaml` (guide-style
   dev-entrypoint running BOTH processes, host 5187→5173, OPENAI_API_KEY
   passthrough), `scripts/test-plgg-poc4-edit.sh`, check-all + npm-install
   registration, README (incl. the developer-applied cloudflared line
   `plgg-poc4.qmu.dev → :5187`), portal README port map.
9. **Verify offline** (tsc, plgg-test >90% on the pure core, fresh
   check-all), serve via `scripts/serve-poc.sh poc4-edit`, smoke the seams
   (`/api/health`, live mint 200, `/api/edit` writes + index refresh +
   reload frame observed headless), then hand to the developer for live
   judging. Verdict recording is a follow-up concluding ticket (as PoC 2/3).

## Quality Gate

Agreed with the developer at ticket time (2026-07-12).

**Acceptance criteria** — the checkable conditions that must hold:

- `resolveEditPath` rejects: `../` traversal, absolute paths, paths
  resolving outside the content root (incl. symlink escape), non-`.md`
  extensions — each as a typed error with a spec asserting it; happy path
  writes inside the root only.
- `POST /api/edit` with a valid body → file content on disk changes
  atomically AND the FTS index reflects the edit on the next `search_docs`.
- `POST /api/session` → 200 `{value, expiresAt}` with a key; honest 404
  without; the standing key never appears in any served byte.
- A `.md` write into the watched content dir emits a reload frame on
  `/__plgg_reload` (observable headless via the proxy).
- Text path: a typed message produces an assistant reply over the same
  session (no second mint).

**Verification method** — what proves them:

- Offline: `./scripts/test-plgg-poc4-edit.sh` (tsc + plgg-test, >90% on the
  pure core: edit guard, event decoding, tool schemas, reducer) and a fresh
  `./scripts/check-all.sh`.
- Headless smoke from the running container: curl `/api/health`, live mint,
  `/api/edit` round-trip, SSE reload frame.
- Live (developer judging at `plgg-poc4.qmu.dev`): conversation works by
  BOTH voice and text; asking the AI to edit the open document lands the
  edit on disk (visible in the edit trail), the iframe doc page hot-reloads,
  and the SAME realtime session continues the conversation uninterrupted.

**Gate** — what must pass before approval:

- Offline suite + check-all green; headless smoke green through the
  container; working tree clean of unrelated changes. The live-judging
  outcome is the developer's call at the approval gate (or deferred to a
  concluding verdict ticket, as PoC 3 did).

## Considerations

- **The SSE proxy must not buffer** — `/__plgg_reload` is a long-lived
  event stream; pipe it raw or the iframe never reloads
  (`packages/plgg-bundle/src/Dev/node/devServer.ts`).
- **The shell page must NOT be served by the dev server** — plgg-bundle
  injects `LIVE_RELOAD_SCRIPT` into every HTML response
  (`packages/plgg-bundle/src/Dev/usecase/decorateDevHtml.ts`); a shell
  served there would `location.reload()` on the agent's own edit and kill
  the session. The shell stays on the poc3-style no-store static server.
- **Index freshness**: search reads the built index, so `/api/edit` rebuilds
  it in-process after a successful write; without that, the agent searches
  stale text right after its own edit
  (`packages/plgg-poc3-voice/src/entrypoints/buildIndex.ts` pattern).
- **Two processes, one container**: mirror `workloads/guide/dev-entrypoint.sh`
  (sibling dist build, then start internal plggpress dev + shell server);
  container recreate wipes OPENAI_API_KEY — preserve with the podman
  printenv passthrough recreate (memory: rootless podman PoC containers).
- **Writer-side transcription event name** is still the first suspect if
  writer lines are missing from the transcript during live judging
  (`packages/plgg-poc3-voice/src/agent.ts` `eventOf`).
- **Verdict discipline**: this ticket takes poc4 only to `building`; the
  verdict flip is a separate concluding ticket guarded by `pocConsistent` +
  the fleet spec, as PoC 2/3 did
  (`packages/plgg-poc-portal/src/pocs.ts`).
- Cross-package source reuse (poc1 FTS) uses the relative-import seam
  exactly as poc3's `src/poc1.ts` — the one specifier spelling every
  resolver shares (memory: new package scaffold gotchas).
