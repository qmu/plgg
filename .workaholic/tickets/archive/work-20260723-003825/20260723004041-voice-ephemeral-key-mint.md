---
created_at: 2026-07-26T01:10:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260723004030-live-edit-bridge.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Voice 1/4 — server-side ephemeral Realtime key mint on the dev surface

## Overview

Give `plggpress dev`'s persistent surface the ONE key-bearing
seam the voice assistant needs: a dev-only endpoint that mints
a short-lived OpenAI Realtime client secret **server-side**
from the operator's standing `OPENAI_API_KEY`. The standing key
never reaches the browser, never enters a `build` output, and
its absence is not an error — with no key the endpoint is an
honest 404 and `plggpress dev` behaves exactly as it does
today.

This is sub-ticket 1 of the four the
`20260723003900-resume-decompose-voice-realtime.md` checkpoint
split `20260723004040-voice-realtime-assistant.md` into. It
lands the server half alone, so the browser bundle
(004042), the `edit_doc` tool (004043) and the reload
arbitration (004044) each rest on something already green.

## Key files

- `packages/plgg-kit/src/LLMs/usecase/mintRealtimeKey.ts` —
  the reusable `KeyMinter` / `minterFromConfig` seam (mints
  via the GA `/v1/realtime/client_secrets` endpoint and
  decodes the top-level `value`/`expires_at`). REUSE it; do
  not clone a second minter.
- `packages/plgg-poc3-voice/src/entrypoints/serve.ts` — the
  proven `POST /api/session` + `GET /api/health` wiring
  (404-without-a-key contract) this promotes.
- `packages/plggpress/src/framework/DevServer/model/PatchProtocol.ts`
  — the sibling wire-contract module to mirror (absolute
  `/__plggpress_*` route constant + `asX` boundary decode).
- `packages/plggpress/src/framework/DevServer/node/devServer.ts`
  — mounts the new routes beside `PATCH_PATH`.
- `packages/plggpress/package.json` — takes the in-repo
  `plgg-kit` dependency.

## Approach

- New `framework/DevServer/model/VoiceProtocol.ts`: the
  dev-only route constants (`VOICE_HEALTH_PATH`,
  `VOICE_SESSION_PATH`) and the wire types — the session
  request (`{ path }`, the route the browser has open) decoded
  as `unknown` with an `asX` caster, and the grant the server
  answers.
- New `framework/DevServer/usecase/voiceWeb.ts`: pure handlers
  over an injected `Option<KeyMinter>` — `None` ⇒ 404 with a
  named reason ("set OPENAI_API_KEY"), `Some` ⇒ mint and answer
  `{ value, expiresAt }`, a mint failure ⇒ 502 with the
  `Defect` message. `health` answers `{ configured }`. The
  minter is INJECTED, so the specs mock the network and no live
  OpenAI call ever runs in a test.
- New `framework/DevServer/node/voiceMinter.ts`: the node edge
  that reads `OPENAI_API_KEY` off `process.env` and builds the
  `Option<KeyMinter>` through `minterFromConfig`. Thin
  composition — coverage-excluded, like the other node edges.
- Mount both routes in `startDevServer` beside the patch
  bridge.
- Add `"plgg-kit": "file:../plgg-kit"` to plggpress's
  dependencies (an in-repo sibling — no new external dep) and
  wire it into `scripts/build.sh` ordering if it is not
  already built before plggpress.

## Quality Gate

- **Acceptance:** with `OPENAI_API_KEY` unset, `GET
  <VOICE_HEALTH_PATH>` answers `{ configured: false }` and
  `POST <VOICE_SESSION_PATH>` answers 404 with a named reason;
  with a key present (a mocked minter in the spec) the POST
  answers 200 with `{ value, expiresAt }` and a mint failure
  answers 502. The standing key appears in NO response body
  and in no `build` output.
- Specs mock the minter; no live network.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage; no `as`/`any`/`ts-ignore`; Prettier
  `printWidth: 50`.

## Policies

- `workaholic:safety` — the standing API key stays
  server-side; only the ephemeral grant crosses to the
  browser; the whole surface is dev-only.
- `workaholic:implementation` — reuse plgg-kit's single
  minter rather than cloning it; the boundary is a checked
  cast, never a trusted body.

## Final Report

Development completed as planned. The dev surface now carries
`GET /__plggpress_voice/health` and `POST
/__plggpress_voice/session`, both running on an INJECTED
`Option<KeyMinter>` (plgg-kit's `minterFromConfig`, the GA
`client_secrets` endpoint). `voiceMinterFrom(env)` is the one
gate; `Press/usecase/devSpec.ts` is the only place the real
`process.env` is read.

Verified live, not just in specs: a scratch dev server was
started on a temp content root and both routes were driven with
`fetch` — with `OPENAI_API_KEY` unset (`HEALTH 200
{"configured":false}` / `SESSION 404 … set OPENAI_API_KEY`) and
with the repository's real key (`HEALTH 200
{"configured":true}` / `SESSION 200
{"value":"ek_…","expiresAt":1784996576}`). The standing key did
not appear in either response body.

### Discovered Insights

- **Insight**: `plggpress`'s self-alias (`plggpress/...`) does
  not resolve under a bare `node foo.mts` — the specifiers are
  a tsconfig `paths` mapping plus the `bin/hook.mjs` module
  resolver the launcher registers.
  **Context**: any ad-hoc script that drives plggpress source
  outside `plgg-test` must `register("./bin/hook.mjs", …)`
  first (or use relative paths all the way down), otherwise
  Node reports `ERR_PACKAGE_PATH_NOT_EXPORTED` against the
  package's `exports` map. This is what the `bin/plggpress.mjs`
  launcher is doing.
- **Insight**: an empty `OPENAI_API_KEY=` is treated as absent,
  not as a key.
  **Context**: an operator who blanks the variable means "turn
  the assistant off"; passing an empty bearer token upstream
  would instead produce a confusing 401 at mint time.
