---
created_at: 2026-07-12T04:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort:
commit_hash: a1624451
category: Changed
depends_on:
mission:
---

# Migrate plgg-kit's Realtime minter to the GA client_secrets API

## Overview

PoC 3 measured it live (2026-07-12): OpenAI retired the pre-GA
`POST /v1/realtime/sessions` mint endpoint — it now answers
`404 Invalid URL` — and the GA replacement
`POST /v1/realtime/client_secrets` takes
`{"session":{"type":"realtime","model":"gpt-realtime"}}` and returns
`{value, expires_at, session}` at the TOP level (no `client_secret`
wrapper). That makes TWO plgg-kit pieces stale:

- `packages/plgg-kit/src/LLMs/usecase/mintRealtimeKey.ts` — posts
  `{model}` to the retired endpoint.
- `packages/plgg-kit/src/LLMs/model/EphemeralKey.ts` (`asEphemeralKey`) —
  decodes the `client_secret.{value,expires_at}` wrapper that GA no longer
  sends, so even a successful GA reply would fail-closed.

plgg-cms's voice mint route (`agentWeb` + `minterFromConfig`, dark by
default in `pressServer.ts`) inherits both, so the production voice agent
would 502 on its first real deploy. PoC 3 worked around it with a direct
GA fetch in its own entrypoint (`plgg-poc3-voice/src/entrypoints/serve.ts`
`mintGrant`) — that is the working reference implementation.

## Implementation Steps

1. `asEphemeralKey`: decode the GA top-level `{value, expires_at}` shape
   (fail-closed as today).
2. `realtimeKeyMinter`: default endpoint
   `https://api.openai.com/v1/realtime/client_secrets`, body
   `{"session":{"type":"realtime","model":<model>}}`.
3. Update `mintRealtimeKey.spec.ts` fixtures to the GA envelope, and
   `pressServer.ts`'s wired endpoint constant.
4. Consider retiring PoC 3's local `mintGrant` in favor of the fixed
   plgg-kit minter (post-PoC integration direction).

## Quality Gate

- plgg-kit + plgg-cms suites green (`test-plgg-kit.sh`,
  `test-plgg-cms.sh`); check-all green.
- A live mint against the real GA endpoint succeeds (PoC 3's
  `/api/session` already proves the request/response shape).
