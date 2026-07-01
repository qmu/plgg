---
created_at: 2026-07-01T01:33:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash: c32284a
category: Changed
depends_on: [20260701013302-refine-number-to-int-ids-counts.md]
---

# Bounded resource quantities: `number` → sized unsigned ints (`U16` / `U32`)

## Overview

Beyond "is an integer" lies "is a *bounded, non-negative* integer." Network and
resource quantities — TCP ports, HTTP status codes, byte caps, millisecond
durations, token budgets — are non-negative integers with hard ranges, yet the
monorepo sweep found **~33 sites** across 7 packages typing them as raw `number`.
The sized unsigned brands already exist (`packages/plgg/src/Basics/U8..U128.ts`);
`U16` (0–65535) fits ports and HTTP status, `U32` fits byte/ms counts and token
budgets. Several call sites **already hand-validate the range today** (the dev
port clamp; `statusOf` silently degrading junk to 500) — a sized type moves that
guard to the type boundary and removes the silent-degradation behavior.

This is the precision tail of the number axis. It **depends on**
`[20260701013302-refine-number-to-int-ids-counts.md]` (establish the integral
brand first), and within this ticket plgg-http's `HttpStatus` work should land
**before** plgg-server's status sites so the latter reuses the brand instead of
re-deriving `U16`.

## Scope (this ticket)

In scope: non-negative **bounded** integer quantities refined `number` → `U16`
or `U32` (or the existing `HttpStatus` brand for status codes):

- Ports (0–65535) → `U16`; HTTP status (100–599) → existing `HttpStatus` /`U16`.
- Byte caps / Content-Length, millisecond timeouts, animation durations/delays,
  max-token budgets, operation-count limits, font-weight → `U32` (or tighter
  where an obvious smaller bound applies).

Out of scope (sweep-excluded): `plgg-http` `HttpStatus.ts:21` Box content
re-brand to `U16` — that is the package's own nominal-scalar definition (like
plgg's Atomics), borderline over-engineering, **leave it**; plain integral ids/
counts (the `Int` ticket); fractional values.

## Key Files

- `packages/plgg-server/src/Serving/usecase/serve.ts:22` — `port: number` → `U16`
  (also `bun.ts` / `deno.ts` adapters). `maxBodyBytes` and timeout fields in the
  same serving layer → `U32`. **Densest cluster.**
- `packages/plgg-http/src/Http/model/HttpStatus.ts:58` — `statusOf(n: number)`
  currently a **total constructor that silently degrades junk to 500**. Make the
  status argument on every response-builder accept the `HttpStatus`/`U16` brand so
  out-of-range/non-integral values are rejected at the boundary instead of
  coerced. **Do this before the plgg-server status sites** so they reuse it.
- `packages/plgg-view/src/Html/model/Attribute.ts:31` — `durationMs: number` →
  `U32` (WAAPI cannot use negative/fractional durations); animation delays too.
- `packages/plgg-kit/src/LLMs/vendor/Anthropic.ts:30` — `maxTokens?: number` →
  `U32` (strictly positive token budget).
- `packages/plgg-press` dev server — `devPort` return / `devUrl` param `number` →
  `U16` (a bounded port that is already range-checked today).
- `packages/plgg-foundry` `maxOperationLimit` / `operationCount` `number` → `U32`
  (non-negative integer counters/limits).

## Implementation Steps

1. **Confirm the `Int` ticket landed** (number-axis foundation).
2. **plgg-http `HttpStatus` first:** make response-builder status args take the
   `HttpStatus`/`U16` brand; replace the silent `→ 500` degradation in `statusOf`
   with a real `Result`/validated construction at the boundary. Land + commit.
3. **plgg-server:** `port` → `U16`, `maxBodyBytes`/timeouts → `U32` across the
   node:http / Bun / Deno adapters; **reuse** the `HttpStatus` brand for status,
   don't re-derive `U16`. Construct from config/CLI at the serving boundary.
4. **plgg-press dev server, plgg-view durations, plgg-kit maxTokens,
   plgg-foundry limits:** refine each to `U16`/`U32`, constructing where the value
   enters (CLI/config/animation spec/request build); fold any existing range
   clamp into the brand construction.
5. Per package: `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green.
6. Add specs proving the boundary now **rejects** out-of-range/negative/fractional
   inputs the prior `number` accepted — e.g. port `70000` and `statusOf(999)` /
   `statusOf(200.5)` no longer silently succeed or degrade to 500.

## Considerations

- **Removing silent degradation is the headline.** `statusOf` coercing junk to
  500 is exactly the bug class a brand prevents — make the invalid case a
  `Result` error at construction, not a quiet substitution. Audit callers for any
  that *relied* on the degrade-to-500 behavior and convert them to handle the
  `Result`.
- **Pick the tightest sensible brand.** Ports and status are genuinely `U16`;
  bytes/ms/tokens are `U32`. Don't reach past available brands — if a value
  needs >32-bit range use `U64`, but don't manufacture new brands here.
- **Share `HttpStatus`** across http/server rather than re-introducing `U16` at
  each site — same value, one brand, sequenced http-before-server for that reason.
- **No escape hatches:** construct via `asU16`/`asU32`/`asHttpStatus`; never
  `as`/`any`/`ts-ignore`.
- Tooling: `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh`; Prettier 50.

## Quality Gate

The `/drive` approval gate requires **all** of:

1. **tsc + tests green:** `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
   passing, >90% coverage thresholds intact.
2. **No new escape hatches:** zero `as`/`any`/`ts-ignore`; all bridges via
   `asU16`/`asU32`/`asHttpStatus`.
3. **Boundary actually tightened:** specs show out-of-range/negative/fractional
   inputs are **rejected** (port `70000`, `statusOf(999)`/`statusOf(200.5)`),
   and `statusOf` no longer silently degrades junk to 500.
4. **Loose-type count drops:** in-scope port/status/byte/ms/budget fields are no
   longer bare `number`; any left loose matches a Scope exclusion.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — refine to the
  tightest numeric brand; no `as`/`any`/`ts-ignore`; Result over silent coercion.
- `workaholic:implementation` / `policies/type-driven-design.md` — replace runtime
  range clamps and silent degradation with a type boundary that fails early.
- `workaholic:operation` / `policies/observability.md` — an out-of-range status/
  port should surface as an explicit error, not a silent 500/default at runtime.

## Drive Progress (2026-07-01)

**Done + committed (`8faa5da`): the HttpStatus builder-brand half.** The six `plgg-http` response builders (`textResponse`/`htmlResponse`/`jsonResponse`/`bytesResponse`/`streamResponse`/`redirectResponse`) and the two `plgg-server` wrappers (`pageResponse`/`javascriptResponse`) now take a `HttpStatus` brand instead of a raw `number`, so a status is constructed once via `statusOf` at the call site rather than each builder silently coercing an arbitrary number. All callers updated (`httpErrorToResponse`'s 8 arms, example servers, specs). Green: plgg-http 32, plgg-server 96, plgg-fetch 27, plgg-press 84.

**Remaining: the U16/U32 resource-quantity sites** (`ServeOptions.port`→U16, `maxBodyBytes`/timeouts→U32; `Motion.durationMs`/`delayMs`→U32; `maxTokens`→U32; foundry counts→U32; press `devPort`→U16). These are **not** a clean mechanical refactor:

- `U16`/`U32` are **Box brands** (`Box<"U16"|"U32", number>`), so every read site needs `.content` and every `?? default` needs the default branded.
- The fields are **author-facing total-constructor inputs** (`serve({ port: 3000 })`, `fadeIn(300)`). Branding them forces the author to either construct a `Result` (`asU16` — breaks the total, ergonomic API) or accept `getOr(box("U16")(dflt))(asU16(n))` boilerplate at **every** call site. There is no clean, ergonomic, no-op-free resolution — the same tension as the (deferred) proc-ladder and the statusOf-degradation removal.

**Recommended rescope (a design decision):** either (a) keep author-facing config numeric and brand **internally at the outermost boundary only** (one `asU16`/`asU32` fold per option in `serve`/animation/kit, not at author call sites) — the pragmatic ergonomic choice; or (b) accept the brand in the public signatures and provide branded default constructors + author-side helpers. Pick one and apply consistently. The HttpStatus half already committed is independent and stands regardless.

## Final Report (rescoped under principle (a): brand boundaries, not author-facing inputs)

Per the author's decision — *利用者が直接書く部分 shouldn't be too strict* — sized brands are applied only at genuine **untrusted-input boundaries**, never on developer-typed literals or ergonomic config APIs.

**Done + committed (`8faa5da`): HttpStatus.** The response builders take a `HttpStatus` brand (a small, closed, well-known domain), and the one genuine untrusted boundary — a network response's status in `plgg-fetch` `seam.ts:138` — is validated through `statusOf`. This removes the arbitrary-number coercion at the builder boundary.

**Intentionally left numeric (principle (a)):** every remaining U16/U32 target is **author-facing config or an internal default**, not an untrusted boundary:
- `ServeOptions.port`/`maxBodyBytes`/timeouts — `serve({ port: PORT })` (author/env config)
- `Motion.durationMs`/`delayMs` — `fadeIn(220)` (author literal)
- `maxTokens` — `openai({ maxTokens })`, default 1024 (author config)
- press `devPort`, foundry `operationCount`/`maxOperationLimit` — author config / internal counters

Branding these would force `asU16`/`getOr(box(...))` boilerplate at ergonomic call sites for **no safety gain** (a developer writing `serve({ port: 3000 })` or `fadeIn(220)` cannot produce an out-of-range value that a brand would catch — and validating an internal counter is redundant). The `Int` integral-refinement (ticket 013302) already covers the "is-an-integer" aspect where it matters.

Verification: HttpStatus half green across plgg-http 32, plgg-server 96, plgg-fetch 27, plgg-press 84. No `as`/`any`/`ts-ignore`.

### Discovered Insight

- **Insight**: A brand pays off only where an **untrusted value crosses a boundary** (a parsed request, a network response, a config decode). On a developer-typed literal (`fadeIn(220)`, `serve({port:3000})`) or an internally-computed value, the brand is a no-op box that only adds ergonomic friction — so those stay plain and validation lives at the true edge (e.g. `statusOf` on an incoming response status).
  **Context**: This is the operating rule for the whole number/string refinement axis under principle (a): brand at edges, keep author APIs plain.
