---
created_at: 2026-05-29T23:18:25+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# plgg-kit: offline test coverage + skill-compliant provider constructors

## Overview

The `plgg-coding-style` review found plgg-kit's vendor adapters are otherwise
exemplary (SDK-free `proc` over the core `postJson` seam, Box-union provider
models with `$` matchers and `asX` casters, Option-typed `apiKey`), but it has
three hard-rule gaps: **every test is `test.skip`** (live-network only → ~0%
offline coverage), the three provider constructors are duplicated statement
bodies, and they materialize raw `undefined` literals to model an optional
`apiKey`. This ticket closes those, plus the smaller soft items.

## Hard-rule gaps to fix

1. **No offline test coverage (skill Testing rule + >90% floor).** All specs are
   `test.skip` live-network integration tests:
   - `src/LLMs/usecase/generateObject.spec.ts:37,60,83`
   - `src/LLMs/vendor/{OpenAI,Anthropic,Google}.spec.ts:12`
   Effective coverage is ~0%; the public constructors, `asConfig`/`asOpenAI`/
   `asAnthropic`/`asGoogle` casters, the env-fallback branch, and request-body
   assembly are wholly untested.
2. **Duplicated statement-bodied constructors (Hard Rule 4 / expression style).**
   `src/LLMs/model/Provider.ts:52-66 (openai)`, `78-92 (anthropic)`,
   `102-114 (google)` are three near-identical function-statement bodies with
   overloads + `const { model, apiKey } = …; return pipe(…)`.
3. **Raw `undefined` literals (Hard Rule 2 — Option, not null/undefined).**
   `Provider.ts:58,84,106` — `typeof arg === "string" ? { model: arg, apiKey: undefined } : arg`
   threads `undefined` purely to feed the `apiKey ? some : none` below, where the
   field is already `Option<string>`.

## Soft findings to fold in

- `src/LLMs/usecase/generateObject.ts:32-51` — the apiKey-resolution `match(provider)`
  lacks the explicit return-type annotation the skill requires, and the provider
  is matched twice (key, then request) → annotate and fold to one `match` that
  yields the per-vendor request fn.
- `generateObject.ts:60,71,82` — `unbox(provider).model` recomputed per branch →
  bind `model` once.
- `generateObject.ts:59,70,81` — `systemPrompt || ""` coalescing → `Option<string>`
  eliminated with `getOr("")`.
- `src/LLMs/model/Provider.ts:24-30` — commented-out `asProvider` union caster
  referencing a non-existent `orCast`; either implement it (fold
  `asOpenAI`/`asAnthropic`/`asGoogle`) to complete the top-level type's triad, or
  delete the dead block. Don't ship commented-out code.
- `src/LLMs/vendor/Anthropic.ts:20,26-27` — `maxTokens = 1024` default param →
  acceptable for an internal seam, but `Option<number>` + `getOr(1024)` is the
  on-idiom form; low priority.
- `src/LLMs/vendor/{OpenAI,Anthropic,Google}.ts` response pipelines decode the
  vendor envelope but return `unknown` (the caller re-decodes against the runtime
  `Datum` schema). This is inherent to a generic `generateObject` — **document**
  that the `unknown` is intentionally caller-decoded rather than "fix" it.

## Key Files

- `src/LLMs/model/Provider.ts` — collapse the three constructors to single
  data-last expressions sharing one `arg -> Config` normalizer that builds
  `apiKey` via `fromNullable` (no `undefined` literal); resolve the `asProvider`
  comment block.
- `src/LLMs/usecase/generateObject.ts` — annotate the `match` return type, fold
  the double provider-match, bind `model` once, replace `|| ""` with `getOr`.
- `src/LLMs/usecase/generateObject.spec.ts`, `src/LLMs/vendor/*.spec.ts` — add
  **offline** specs (see steps); keep the live calls as `test.skip`.

## Implementation Steps

1. **Add offline specs** (the core of this ticket):
   - Constructors: `openai("gpt-…")` vs `openai({ model, apiKey })`, asserting
     `apiKey` is `some`/`none` correctly.
   - Casters: `asConfig`/`asOpenAI`/`asAnthropic`/`asGoogle` against valid and
     invalid `unknown` inputs (Result ok/err).
   - Request + decode: inject a fake `fetch` or stub `postJson` so the `proc`
     chain assembles the request body and decodes a canned vendor response
     **without network**. Cover the env-fallback branch (apiKey from `env`).
   - Leave the existing live-network tests as `test.skip` (don't delete them).
2. **Rewrite the provider constructors** as single expressions sharing one
   normalizer; remove the `undefined` literals via `fromNullable`.
3. **Fold in the generateObject soft fixes** (match annotation + single fold,
   bound `model`, `getOr("")`), and resolve the `asProvider` comment.
4. **Document** the intentional `unknown` LLM payload return (one JSDoc line).
5. **Verify**: `scripts/tsc-plgg-kit.sh` clean, `scripts/test-plgg-kit.sh` green
   with the new offline specs actually running (not skipped), grep for escape
   hatches clean.

## Considerations

- **The test gap is the priority.** A package whose entire suite is `test.skip`
  has no regression safety; the offline specs are the highest-value part of this
  ticket. Stubbing `postJson`/`fetch` keeps them deterministic and network-free.
- plgg-kit has no numeric coverage threshold (`coverage: { all: true }`), so CI
  won't fail on low coverage — which is exactly why the skipped suite went
  unnoticed. Treat the ≥90% floor as the target for the newly-covered functions.
- Keep vendor adapters SDK-free over `postJson` (already correct) — the offline
  tests must not introduce a real network dependency or a vendor SDK.
- The `unknown` return from the vendor decode is **by design** (schema is a
  runtime `Datum`, not a static caster); don't try to make it statically typed —
  just document the caller-re-decodes contract.

## Open Questions

- Stub `postJson` (plgg core helper) vs inject a fake `fetch` for the offline
  tests — recommend stubbing `postJson` since the adapters call it directly.
- Whether to implement `asProvider` now (completes the triad) or delete the dead
  comment — recommend implementing if a real union-cast combinator exists,
  otherwise delete and note it.
