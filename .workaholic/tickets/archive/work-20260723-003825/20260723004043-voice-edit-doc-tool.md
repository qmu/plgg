---
created_at: 2026-07-26T01:12:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260723004042-voice-dev-browser-client.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice 3/4 — the `edit_doc` tool call routed through the EXISTING live-edit bridge

## Overview

Give the voice assistant its write path: an `edit_doc` tool
whose calls become a POST to the **existing**
`POST /__plggpress_patch` bridge (004030) — the one edit path,
reused, never a second one. The writer says "change that
sentence"; the model emits a `{find, replace}` edit against the
open document; the bridge authorizes the path, applies the
granular edit, writes atomically, and pushes a reload. The
tool's answer goes back over the `oai-events` data channel so
the model can keep talking about what it just did.

## Key files

- `packages/plggpress/src/framework/DevServer/model/PatchProtocol.ts`
  — `PATCH_PATH` and `asPatchRequest`; the tool's arguments
  must decode into exactly this `{path, edits}` shape.
- `packages/plggpress/src/framework/DevServer/node/patchWeb.ts`
  — the bridge handler; unchanged by this ticket. Its typed
  refusals (400 authz, 404 missing, 422 unapplicable, 500
  write) become what the tool reports back to the model.
- `packages/plgg-poc3-voice/src/agent.ts` — `SEARCH_TOOL` is
  the tool-schema shape to mirror; `sendToolOutput` in
  `vendors/realtime.ts` is the reply seam.
- `framework/DevServer/usecase/voiceInstructions.ts` (from
  004042) — where the tool schema and the session instructions
  are assembled server-side.

## Approach

- Declare `EDIT_DOC_TOOL` beside the instructions: a
  `{ find, replace }` (plus an optional reason) function
  schema, described so the model edits the OPEN document by
  quoting an exact existing span rather than rewriting the
  file. The document's content-root-relative path is fixed by
  the server at mint time — the model never names a path, so it
  cannot aim the bridge at another file.
- A pure `editRequestOf(docPath, args)` maps the tool's decoded
  arguments onto a `PatchRequest`; unit-tested, including the
  refusal for arguments that are not the expected shape.
- The browser edge turns a decoded `EditRequested` event into
  `fetch(PATCH_PATH, …)` and folds the bridge's typed JSON
  answer into the tool output it sends back over the data
  channel — success names the file, a refusal reports the
  bridge's own reason verbatim so the model can retry with a
  different span.

## Quality Gate

- **Acceptance:** an `edit_doc` tool call decoded from a
  Realtime `response.function_call_arguments.done` frame
  produces exactly one POST to `PATCH_PATH` with a body
  `asPatchRequest` accepts, targeting the session's own
  document; a bridge refusal is reported back to the model
  rather than swallowed. No second write path is added — the
  bridge handler is untouched. Verified end-to-end against a
  running dev server with a stubbed tool call (no live
  OpenAI).
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage; no `as`/`any`/`ts-ignore`; Prettier
  `printWidth: 50`.

## Policies

- `workaholic:implementation` — one edit path. The assistant
  is an alternate DRIVER of the bridge, not a parallel editing
  implementation.
- `workaholic:safety` — the model cannot choose the target
  file; the path is server-fixed and still passes the bridge's
  lexical + realpath authorization.

## Final Report

Development completed as planned. The assistant now writes —
through the EXISTING bridge, and only through it:

- `usecase/voiceInstructions.ts` declares `EDIT_DOC_TOOL`
  (`{find, replace}` — no path) and the edit protocol the model
  is instructed to follow; `voiceToolsOf` offers the tool only
  when a document is actually open, so an ungrounded route is
  never handed an edit it could not land.
- `browser/voiceProtocol.ts` decodes a
  `response.function_call_arguments.done` frame named
  `edit_doc` into an `EditRequested`, refusing an empty or
  unparseable `find` before it can reach the bridge as a
  no-op; `patchBodyOf` shapes exactly the `{path, edits}`
  `asPatchRequest` accepts, and `toolOutputOf` folds the
  bridge's own JSON answer into what the model is told.
- `browser/voiceClient.ts` posts to `POST /__plggpress_patch`
  and replies over the data channel with
  `function_call_output` + `response.create`.

`node/patchWeb.ts` is untouched — there is still exactly one
write path, and the model cannot choose the file: the session's
document is fixed server-side at mint time.

Verified live in a real browser against a running `plggpress
dev` (temp content root, no repository file touched). Playwright
imported the SERVED, type-stripped `voiceProtocol` module,
fed it a real Realtime tool-call frame, and posted the result:

```
decoded    EditRequested (call_live_1)
sent       {"path":"index.md","edits":[{"find":"Original body.",
            "replace":"Edited by the assistant."}]}
status     200
bridge     {"path":"index.md","applied":true}
toolOutput {"applied":true,"path":"index.md"}
```

`index.md` on disk then read `Edited by the assistant.`, and
the re-fetched page rendered it. The session route also
answered with the `edit_doc` tool in `tools` and an
`edit_doc`-bearing instruction block.

### Discovered Insights

- **Insight**: the served browser modules can be imported and
  driven directly from a page (`await
  import("/__plggpress_voice/module/voiceProtocol")`), which
  makes the whole browser half of the loop verifiable in a real
  browser without a microphone or a live model.
  **Context**: this is the practical substitute for an
  end-to-end voice test — the only unexercised piece left is
  the WebRTC transport itself, which is exactly what the
  coverage exclusion on `voiceClient.ts` already declares.
- **Insight**: keeping the tool schema pathless is the whole
  containment argument.
  **Context**: the bridge's lexical + realpath guards still
  run, but they never even see a model-chosen path — the
  server substitutes the session's own document, so a
  prompt-injected "edit ../../etc/passwd.md" has nowhere to
  land.
