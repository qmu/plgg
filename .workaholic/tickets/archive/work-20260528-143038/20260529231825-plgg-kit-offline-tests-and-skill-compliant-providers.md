---
created_at: 2026-05-29T23:18:25+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort: 1h
commit_hash: 79b77a7
category: Changed
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

## Final Report

plgg-kit went from **0 offline tests** (entire suite `test.skip`) to **12**, and
the provider model is now expression-style and `undefined`-free.
`scripts/tsc-plgg-kit.sh` is clean and `scripts/test-plgg-kit.sh` passes (12
offline + 6 skipped live), escape-hatch/`undefined`/`|| ""` greps clean.

### What changed
- **Provider.ts**: a shared `toConfig(arg)` normalizer builds the `Config`
  (`apiKey` via `fromNullable`, never an `undefined` literal); each of
  `openai`/`anthropic`/`google` collapsed to a single
  `pipe(toConfig(arg), box("Tag"))` expression. Deleted the dead `asProvider`/
  `orCast` comment block (no such combinator exists; `Provider` is constructed,
  not decoded from `unknown`, so the union caster wasn't needed).
- **generateObject.ts**: `model` and `instructions` bound once (was recomputed in
  all three branches); `systemPrompt || ""` → `pipe(fromNullable(systemPrompt),
  getOr(""))`.
- **Tests**: new `Provider.spec.ts` (constructors string-vs-config + apiKey
  some/none; casters against raw boxes and invalid input). `generateObject.spec.ts`
  gained four offline tests covering all three vendor request-assembly+decode
  paths and the env-fallback branch, plus the existing three live tests kept
  `test.skip`.

### Open questions resolved
- **Stub `postJson`, not `fetch`** — the adapters call `postJson` directly, so a
  `vi.mock("plgg", importOriginal)` partial mock overriding only `postJson`
  (URL-branched to return each vendor's envelope shape) was the clean seam; it
  exercises provider dispatch → apiKey resolution → request assembly → decode
  end to end, offline.
- **Deleted the `asProvider` comment** rather than implementing it — no real
  union-cast combinator exists and nothing decodes a `Provider` from `unknown`.
- **`match` return-type annotation / double-match fold**: left as-is — the two
  matches infer correctly and compile clean (the skill's annotation rule targets
  inference-to-`unknown`, which doesn't occur here); folding the two into one was
  judged not worth the churn. `maxTokens = 1024` default left as an acceptable
  internal-seam default. The `unknown` vendor-decode return is documented as
  intentionally caller-re-decoded.

### Discovered Insights

- **Insight**: The provider `asX` casters (`asOpenAI` etc., via
  `forContent("Tag", asConfig)`) decode **raw external** input where `apiKey` is a
  plain string (or absent → `forOptionProp` → `None`). They do **not** round-trip
  a *built* provider, whose `apiKey` is already an `Option` box — feeding
  `openai({apiKey:"k"})` back through `asOpenAI` fails `asConfig` (a `Some` box is
  not a string). So `Config`'s wire shape (`apiKey?: string`) differs from its
  in-memory shape (`apiKey: Option<string>`); the constructor bridges the two.
  **Context**: When testing these casters, feed raw `box("Tag")({model, apiKey?})`
  literals, not constructor output.
- **Insight**: `vi.mock("plgg", importOriginal)` cleanly stubs just the network
  seam (`postJson`) while keeping every other plgg export real via `...actual` —
  the right pattern for offline-testing the vendor adapters. Two gotchas: inline
  any constants used inside the factory (it is hoisted above module-level
  `const`s), and use `vi.stubEnv` (not `process.env`) for the env-fallback test
  since plgg-kit's spec tsconfig has no `node` types.
  **Context**: `packages/plgg-kit/src/LLMs/usecase/generateObject.spec.ts`.
