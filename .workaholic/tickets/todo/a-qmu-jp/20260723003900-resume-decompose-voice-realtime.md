---
created_at: 2026-07-25T00:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Added
depends_on: []
mission: plggpress-column-layout-and-voice-ai-editing
---

# RESUME — decompose voice-realtime (004040) before driving it

**Read this first.** This is a `/carry` resumption checkpoint written
2026-07-25. Do NOT drive `20260723004040-voice-realtime-assistant.md`
as-is — it has been **deferred by three separate autonomous drive
passes** because it is one large, tightly-coupled integration that
cannot land green with >90% coverage in a single focused pass without
risking the already-delivered dev surface. **First split it into the
four sub-tickets below, then drive them in order.** This ticket is a
plan/checkpoint only — it implements nothing.

## Position (what is already done and green on this branch)

Branch `work-20260723-003825`, PR **#87 (open)**, head `32d5d4d6`.
Mission acceptance **4/6**. The whole substrate the voice assistant
needs is committed and green:

- **004000** plggpress renders docs nav through plggmatic's column strip
  (`pm-row`/`pm-col`); vendored `themeSupport` retired.
- **004010** `SiteConfig.theme` config-driven (plggmatic
  `pragmaticThemeWithPalette`).
- **004020** persistent, plggpress-owned dev server
  (`framework/DevServer`: `startDevServer` + `makeReloadHub` SSE hub +
  `devWeb` injector) surviving rebuilds.
- **004030** live-edit bridge `POST /__plggpress_patch` (PoC-4b
  `applyEdits` + path guard + realpath containment + atomic write +
  `hub.notify`).
- **CLI wiring** (`9f4542b8`): `plggpress dev` now serves through its OWN
  surface with the bridge mounted and file-watch hot reload — the
  prerequisite the prior pass front-loaded is DONE.

## Remaining work

`20260723004040-voice-realtime-assistant.md` (deferred ×3) and
`20260723004050-guide-column-and-voice.md` (depends on 004040).

## Decompose 004040 into these four sub-tickets, then drive in order

1. **Server-side ephemeral Realtime key mint.** A dev-only endpoint on
   the persistent surface that mints an ephemeral OpenAI Realtime client
   secret server-side; `OPENAI_API_KEY` NEVER reaches the browser or
   `build` output; absent key ⇒ endpoint disabled, dev unchanged. Specs
   mock the network. (Infrastructure)
2. **Dev-only browser voice bundle.** The WebRTC Realtime client from
   `packages/plgg-poc3-voice`, served only by the dev surface, grounded
   in the open page's text. No live network in specs. (UX)
3. **`edit_doc` tool → existing bridge.** The assistant's edit tool posts
   a patch to the EXISTING `POST /__plggpress_patch` (reuse it — do NOT
   add a second edit path). (Infrastructure)
4. **Hot-reload arbitration.** The edited page hot-reloads over the SSE
   hub while the realtime WebRTC session stays connected (PoC-4c
   patch/reload arbitration so a reload does not drop the live session).
   (Infrastructure)

Then drive `20260723004050-guide-column-and-voice.md`: document the
column layout + the voice-editing dev workflow in the guide, keep the
plggpress README in sync, guide builds with no dead links
(`cd packages/guide && npm run build`).

## Key files / prior art

- `packages/plgg-poc3-voice/src/` — OpenAI Realtime client (client-secret
  mint via `/v1/realtime/client_secrets`, SDP via `/v1/realtime/calls`,
  tool-call loop over the oai-events data channel).
- `packages/plgg-poc4c-livesite/src/` — `bridge.ts`/`patchClient.ts`/
  `spanMap.ts`/`reloadPolicy.ts` patch/reload arbitration.
- `packages/plggpress/src/framework/DevServer/` — `startDevServer`,
  `makeReloadHub`, `/__plggpress_patch`.

## Two follow-up concerns recorded this run (carry forward)

- **Dead plgg-bundle dev scaffolding** now unused but present
  (`devPlan`/`devEntryEnv`/`devServerEntry`/`devEntry`/`pressDevEntry`) —
  wants a cleanup pass.
- **Theme `.ts` hot-reload (module re-import) is gone** under the
  in-process surface (content/config file-watch reload remains) — a
  concern for the sibling `grow-plggmatic-as-the-reference-framework`
  work, not plggpress.

## Constraints

`OPENAI_API_KEY` server-side only; realtime network mocked in specs;
coverage >90%; no `as`/`any`/`ts-ignore`; Prettier printWidth 50; the
dev surface must never leak into production `build` output.

## Quality Gate

- This checkpoint is satisfied when 004040 has been split into the four
  sub-tickets above (each stamped `mission:
  plggpress-column-layout-and-voice-ai-editing`, `depends_on` ordered)
  and the original 004040 marked superseded — after which a normal
  `/drive` or `/monitor` continues.
- Archive this resume ticket once the split is emitted.

## Policies

- `workaholic:implementation` / `objective-documentation` — this is a
  recovery checkpoint; keep it verifiable and machine-actionable.
- `workaholic:implementation` / `operational-planning` — decompose the
  oversized unit before driving so a single pass can close each part.
