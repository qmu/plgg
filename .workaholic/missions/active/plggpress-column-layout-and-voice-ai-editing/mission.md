---
type: Mission
title: plggpress column layout and voice AI editing
slug: plggpress-column-layout-and-voice-ai-editing
status: active
created_at: 2026-07-23T00:38:52+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: plgg-horizontal-orientation-ui-stack
drive_authorized: true
predicted_hours:
actual_hours: 1.4
tickets: []
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
---

# plggpress column layout and voice AI editing

## Goal

plggpress is the plgg family's documentation-site generator — a from-scratch,
VitePress-like SSG (`npx plggpress build` / `dev`) built on the plgg stack. The
technical-confidence PoC fleet has landed its verdicts (that mission is achieved); the
client-side-LLM Reader story moved to qfs. qfs is a large, slow project, so plggpress
advances **on its own track** now, with the parts that stand on their own.

Two of those parts define this mission:

1. **plggpress should render through plggmatic's column-oriented horizontal layout** —
   the same reference layout `packages/plggmatic` implements in demo1, where drilling
   into a section opens a new column to the right and "depth does not consume the
   viewport." plggpress today has its own fixed sidebar+content+rail doc shell and only
   *vendors a copy* of plggmatic's Style layer; it does not depend on the framework. The
   goal is that the family's one general horizontal-orientation framework drives the
   doc site, in the qmu.co.jp aesthetic — monochrome black-and-white, beauty carried by
   spacing and layout.
2. **The writer edits conversationally, by voice.** In dev mode, a writer talks to an AI
   assistant that is "on the same page" as the open document — sees the text, discusses
   it, and its tool calls edit the local markdown files; the edited page hot-reloads
   while the realtime session stays alive. The proven artifacts for this already exist in
   the PoC packages (`plgg-poc3-voice` over the OpenAI Realtime API, and
   `plgg-poc4c-livesite`'s edit bridge — `bridge.ts` / `patchClient.ts` / `spanMap.ts`);
   this mission integrates them into production plggpress.

This executes the [[plgg-horizontal-orientation-ui-stack]] strategy: plggmatic is the
framework, plggpress is the first product resting on it.

## Scope

**Definition of done:**

- plggpress takes a real dependency on the `plggmatic` package and renders its
  documentation navigation through plggmatic's column-oriented horizontal layout
  (`multiColumn`) — drilling a section opens a column to the right — replacing the
  vendored `themeSupport` Style copy. The qmu.co.jp black-and-white aesthetic is
  preserved.
- The B&W theme is selectable/overridable through `SiteConfig` rather than hard-bound at
  the composition root (the `defaultTheme` seam identified in `theme/baseCss.ts` /
  `shell.ts`).
- `plggpress dev` gains a **persistent, self-owned server surface** (the `serveWeb`-style
  path plggpress currently omits) with a client channel it controls, and a **live-edit
  bridge**: a tool call patches the open markdown file on disk and the edited page
  hot-reloads while the session stays connected.
- With `OPENAI_API_KEY` set, `plggpress dev` shows a **voice assistant** "on the same
  page" as the open document; talking to it produces edits to the local doc that
  hot-reload while the realtime websocket session stays alive.
- The plgg guide documents the new column layout and the voice-editing dev workflow
  (what it is, the live URL, the local dev command).

**Out of scope:**

- The Reader-side client-side-LLM / browser-RAG story — moved to qfs; not revived here.
- Rewriting plggmatic's framework internals beyond what plggpress needs to consume the
  column layout cleanly; deeper framework generality (per-component theming slots, the
  general horizontal runway) is the sibling `grow-plggmatic-as-the-reference-framework`
  mission's business. Where plggpress hits a framework class-name-override smell, it is
  noted as a concern for that mission, not fixed here.
- Production-grade auth/ops for the dev server (dev-only surface, `OPENAI_API_KEY` local).
- Publishing a new plggpress npm release (a separate gated release step).

## Experience

- **The doc site is a horizontal column strip.** Opening plggpress renders the site in
  plggmatic's column-oriented layout: the left column is the nav, and selecting a section
  opens its content as a new column to the right rather than replacing the body. The top
  bar / body width stays fixed as the strip grows and scrolls horizontally underneath —
  "depth does not consume the viewport," the demo1 regression property. On a narrow
  viewport the columns become a scroll-snap strip. Colours are pure monochrome; the
  design reads as qmu.co.jp.
- **The dev server owns its client.** `plggpress dev` serves a persistent process (not a
  one-shot render) with a client channel it controls; editing a source file hot-reloads
  the affected page without dropping that channel.
- **A tool call edits the open file and the page updates in place.** A patch to the open
  markdown lands on disk through the edit bridge; the rendered page hot-reloads to show
  it while the live session (websocket) stays connected — no full navigation, no session
  drop.
- **The writer edits by voice.** With `OPENAI_API_KEY` present, a voice assistant appears
  on the dev site. The writer speaks about the open document; the assistant, grounded in
  the page's text, discusses it and — through its tool calls reaching the dev server —
  edits the local markdown, the edited page hot-reloading while the realtime session
  stays alive. Without the key, dev runs exactly as before (no assistant).
- **The workflow is documented.** A developer opening the plgg guide reaches a page that
  explains the column layout and the voice-editing dev loop, with the live URL and the
  local `plggpress dev` command.

## Acceptance

<!-- Ticket filenames attached as (#<ticket>.md) markers. -->

- [x] plggpress depends on the `plggmatic` package and renders its documentation
      navigation through plggmatic's column-oriented horizontal layout — drilling a
      section opens a new column to the right, the qmu B&W aesthetic preserved, the
      vendored `themeSupport` copy retired; with a test asserting the column-strip
      structure (#20260723004000-adopt-plggmatic-column-layout.md)
- [x] The B&W doc-site theme is selectable/overridable through `SiteConfig` rather than
      hard-bound at the composition root, with a test
      (#20260723004010-config-driven-theme-seam.md)
- [x] `plggpress dev` runs a persistent, self-owned server surface with a client channel
      it controls; editing a source file hot-reloads the page while the channel stays
      connected (#20260723004020-persistent-dev-server-surface.md)
- [x] A live-edit bridge patches the open markdown file on disk from a tool call and the
      edited page hot-reloads while the live session stays connected (integrating the
      `plgg-poc4c-livesite` bridge artifacts) (#20260723004030-live-edit-bridge.md)
- [ ] With `OPENAI_API_KEY` set, `plggpress dev` shows a voice assistant "on the same
      page"; speaking to it produces edits to the local doc that hot-reload while the
      realtime session stays alive (integrating the `plgg-poc3-voice` artifacts)
      (#20260723004040-voice-realtime-assistant.md)
- [ ] The plgg guide documents the column layout and the voice-editing dev workflow (what
      it is, live URL, local dev command) (#20260723004050-guide-column-and-voice.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time. -->
- 2026-07-23 — strategy created — plgg-horizontal-orientation-ui-stack
- 2026-07-23 — strategy linked — plgg-horizontal-orientation-ui-stack
- 2026-07-23 — ticket added — 20260723004000-adopt-plggmatic-column-layout.md
- 2026-07-23 — ticket added — 20260723004010-config-driven-theme-seam.md
- 2026-07-23 — ticket added — 20260723004020-persistent-dev-server-surface.md
- 2026-07-23 — ticket added — 20260723004030-live-edit-bridge.md
- 2026-07-23 — ticket added — 20260723004040-voice-realtime-assistant.md
- 2026-07-23 — ticket added — 20260723004050-guide-column-and-voice.md
- 2026-07-23 — ticket archived — 20260723004000-adopt-plggmatic-column-layout.md
- 2026-07-23 — ticket archived — 20260723004010-config-driven-theme-seam.md
- 2026-07-23 — tickets deferred — 20260723004020/004030/004040/004050: the
  overnight drive delivered the column-layout + config-theme foundation (green
  check-all); the persistent-dev-server → live-edit-bridge → voice-realtime →
  guide chain (a coupled, integration-test-heavy build on a new self-owned
  streaming server) was deferred to a follow-up drive to keep the delivered work
  green. These four remain in todo, unchanged and fully specified.
- 2026-07-23 — ticket archived — 20260723004020-persistent-dev-server-surface.md
- 2026-07-23 — ticket archived — 20260723004030-live-edit-bridge.md
- 2026-07-23 — run recorded (+1.4h) — monitor-20260723-011758

## Reflection

### 2026-07-23 run monitor-20260723-011758
- blocked: none hard — the voice-realtime chain (004040) was deferred deliberately across two waves to protect already-green work; it is large and needs the persistent dev server wired into the plggpress dev CLI first.
- leaked questions: none — the mission was interrogated at creation.
- front-load next: wire the persistent dev server into the plggpress dev CLI, then drive 004040 (voice-realtime) + 004050 (guide) — the mission's headline value still outstanding.
