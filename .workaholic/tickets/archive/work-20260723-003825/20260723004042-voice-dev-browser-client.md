---
created_at: 2026-07-26T01:11:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260723004041-voice-ephemeral-key-mint.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice 2/4 — the dev-only browser voice client, grounded in the open page

## Overview

Serve a dev-only voice panel on `plggpress dev`'s own surface:
a WebRTC OpenAI Realtime client that opens from the ephemeral
grant minted in 004041, streams the writer's microphone, and is
GROUNDED in the text of the document the browser has open. With
no `OPENAI_API_KEY` no client is served and no panel appears —
dev is byte-for-byte what it is today. The client can never
reach a production `build`: it is served by a dev route and
injected by the dev-only HTML decoration.

## Key files

- `packages/plgg-poc3-voice/src/vendors/realtime.ts` — the
  proven WebRTC plumbing (SDP exchange against
  `/v1/realtime/calls`, the `oai-events` data channel, the GA
  `session.update` shape with the REQUIRED `session.type` and
  `audio.input.transcription`).
- `packages/plgg-poc3-voice/src/agent.ts` — the proven pure
  half: `eventOf` (data channel → domain event) and
  `instructionsOf` (who the assistant is + the open document).
- `packages/plggpress/src/framework/DevServer/model/DevChannel.ts`
  and `usecase/decorateDevHtml.ts` — the existing dev-only
  "append a script to rendered HTML OUTPUT" seam this extends.
- `packages/plggpress/src/router/pressRouter.ts` —
  `candidateFiles` is the route→source-`.md` inverse the
  server uses to find the open document's text.

## Approach

- The browser code is REAL TypeScript under
  `framework/DevServer/browser/`, not a string blob:
  - `browser/voiceProtocol.ts` — zero-import, total pure
    functions (Realtime event decode, the transcript fold).
    Fully unit-tested from Node specs.
  - `browser/voiceClient.ts` — the DOM/WebRTC edge that
    imports `./voiceProtocol`. Coverage-excluded (the same
    stance `plgg-poc3-voice/src/vendors/realtime.ts` takes:
    it can only run against a live browser, mic, and
    endpoint), still typechecked by `tsc --noEmit`.
  These modules take NO bare-specifier imports, so they need
  no bundler: the dev server serves them as ES modules after
  `node:module`'s `stripTypeScriptTypes`, from a route that
  only ever exposes that one directory by whitelisted name.
- Grounding is computed SERVER-SIDE at mint time (it is the
  testable half): the session POST carries the route the
  browser has open; the server maps it to its `.md` through
  `candidateFiles`, reads it, and returns the instructions and
  tool list beside the grant. The browser only forwards them
  into `session.update`.
- `decorateDevHtml` gains a voice-enabled variant appending the
  module `<script>`; it stays OFF unless the surface actually
  has a minter, so the no-key path is unchanged and the
  `build`-output assertions stay green.

## Quality Gate

- **Acceptance:** with a key configured, a dev-served page
  carries the voice module script and the client route answers
  the type-stripped module (valid JS, no TS annotations left);
  with no key, neither the script nor the route is present and
  the served HTML is unchanged. The instructions the mint
  returns contain the open document's text (asserted from a
  fixture content root). No live network in specs.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage; no `as`/`any`/`ts-ignore`; Prettier
  `printWidth: 50`.

## Policies

- `workaholic:design` — the panel is a dev affordance: it
  appears only when it can work, and says why when it cannot.
- `workaholic:implementation` — the browser edge is thin and
  typed; every decision it makes is a pure function tested
  offline.
- `workaholic:safety` — the client only ever holds the
  ephemeral grant; the dev module route serves a whitelisted
  directory, never an arbitrary path.

## Final Report

Development completed as planned. `plggpress dev` now serves a
dev-only voice panel when — and only when — an operator key is
present:

- `framework/DevServer/browser/voiceProtocol.ts` — the pure,
  import-free decoder (100% covered from Node specs).
- `framework/DevServer/browser/voiceClient.ts` — the DOM /
  WebRTC edge (coverage-excluded, still `tsc`-checked).
- `framework/DevServer/node/voiceModuleWeb.ts` — serves those
  two files as ES modules through Node's built-in
  `stripTypeScriptTypes`, behind the pure whitelist in
  `usecase/voiceModule.ts`.
- Grounding is computed SERVER-side:
  `node/openDoc.ts` maps the route the browser is on to its
  `*.md` via the render path's own `candidateFiles`, and
  `usecase/voiceInstructions.ts` quotes it into the session
  instructions the mint returns beside the grant.
- `decorateDevHtml(html, voice)` / `injectDevClients(voice)`
  add the module `<script>` only when the surface holds a
  minter.

Verified live in a real browser, not only in specs. Two real
`plggpress dev` servers were run against `packages/guide`:

- WITH the key (`:5199`) — the page carries
  `/__plggpress_voice/module/voiceClient`; the module route
  answers `200 text/javascript` with the relative
  `from "./voiceProtocol"` import intact and every type
  annotation stripped; an unlisted module name answers 404;
  Playwright reported the panel mounted in the DOM
  (`"Talk about this pageready"`) with no page console errors.
  `POST …/session {"route":"/getting-started/"}` answered a
  real grant plus `"doc":"getting-started.md"` and
  instructions quoting the actual file.
- WITHOUT the key (`:5198`) — zero occurrences of
  `__plggpress_voice` in the served HTML, health
  `{"configured":false}`, session 404, and the live-reload
  client still present, i.e. dev unchanged.

### Discovered Insights

- **Insight**: a browser module can be REAL, type-checked
  TypeScript with no bundler in the loop, as long as it takes
  no bare-specifier imports — the dev server serves it through
  `node:module`'s `stripTypeScriptTypes` and the browser
  resolves its relative sibling against the same module base.
  **Context**: this is why the voice client is not a
  `<script>` string constant like `LIVE_RELOAD_SCRIPT`. The
  cost is that browser-side modules cannot use plgg's
  `Option`/`Result`, so absence is modelled inside the closed
  union (`Ignored`) instead — the same discipline without the
  import.
- **Insight**: resolving "which document is the writer looking
  at" on the SERVER (through `candidateFiles`, the render
  path's own inverse of `discoverPaths`) removes an entire
  class of drift.
  **Context**: the browser sends a route, never a path. The
  session's edit target is therefore fixed by the server for
  the whole session — which is also what makes the next
  ticket's `edit_doc` tool unable to aim at another file.
