---
created_at: 2026-06-10T12:29:32+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure, Domain]
effort:
commit_hash:
category:
depends_on:
---

# Build request query/params/header maps with a null prototype

## Overview

Request keys flow into plain objects via `Object.fromEntries(url.searchParams)`,
`Object.fromEntries(headers)`, and computed-key spread for route params. This
does **not** cause global prototype pollution (verified: these create own
properties; `Object.prototype` is untouched). The real defect is **Option
soundness**: because the maps inherit `Object.prototype`, a lookup for a key the
client never sent — `getQuery("constructor")`, `getParam("__proto__")`,
`getHeader("toString")` — returns the inherited function instead of `none()`,
violating the project's "Option not null" guarantee and potentially misleading
handler logic that branches on presence.

Severity: **LOW** (correctness / defense-in-depth, not memory corruption).

## Key Files

- `packages/plgg-server/src/Http/usecase/toHttpRequest.ts` (lines 97-99) — `Object.fromEntries` for query and headers.
- `packages/plgg-server/src/Routing/usecase/matchSegments.ts` (lines 48-71) — `{ ...captured, [seg.content]: ... }` param accumulation.
- `packages/plgg-server/src/Http/model/HttpRequest.ts` (`getQuery`/`getParam`/`getHeader`, lines 44/52/62) — bracket lookups that should reliably yield `none()` for absent keys.
- `packages/plgg-router/src/Routing/usecase/matchSegments.ts` and `parseQuery.ts` — the router has the same shape (query keys are attacker-controlled there too); fix in parallel for consistency.

## Implementation Steps

1. Build the query/headers/params maps on a null prototype: `Object.assign(Object.create(null), Object.fromEntries(...))`, or construct via a reduce into `Object.create(null)`. Alternatively, make the accessors use `Object.hasOwn(map, name)` before reading so inherited keys reliably return `none()`.
2. Apply the same treatment in `plgg-router` (`matchSegments.ts`, `parseQuery.ts`) where query keys are percent-decoded from untrusted input.
3. Tests: `getQuery`/`getParam`/`getHeader` for `"constructor"`, `"__proto__"`, `"toString"` (never sent by the client) return `none()`.

## Considerations

- **Preferring Rich Typing** (`standards:implementation`): `getQuery` returning `Option` is the contract; the inherited-key hole makes the type lie. Closing it restores the signature's promise. (`packages/plgg-server/src/Http/model/HttpRequest.ts`)
- **Domain Layer Separation**: this lives in the thin HTTP entry layer; keep the null-prototype construction there so domain handlers receive trustworthy `Option` lookups. (`packages/plgg-server/src/Http/usecase/toHttpRequest.ts`)
- Confirm `match`/spread over these maps elsewhere still behaves with a null-prototype object (no reliance on `Object.prototype` methods on them).
- Strict no-`as`/`any`/`ts-ignore` (CLAUDE.md); keep coverage >90%.
