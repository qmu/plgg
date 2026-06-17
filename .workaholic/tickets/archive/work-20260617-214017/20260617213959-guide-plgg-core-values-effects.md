---
created_at: 2026-06-17T21:39:59+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: f557d25
category: Changed
depends_on: [20260617213958-guide-getting-started-and-concepts.md]
---

# Guide T3 — plgg core API: values & effects

## Overview

Document the first half of the `plgg` core API — the value types and the
effect/composition combinators developers touch most. Hand-written reference
pages with signatures, behavior, and runnable examples; the exhaustive
auto-generated reference (every symbol) comes in T8, so this ticket curates the
**guided** API surface, organized by the module categories.

## Key Files

- `packages/guide/packages/plgg/*` (new pages under the plgg section).
- `packages/plgg/src/Atomics/` (SoftStr, Num, Int, Bool, Time, BigInt, Bin, …),
  `Basics/` (Str, Float, the integer/case brands), `Disjunctives/` (Option,
  Result, Datum, Atomic, ObjLike), `Contextuals/` (Box, Some/None, Ok/Err),
  `Flowables/` (cast, proc, pipe, flow, match, hold), `Functionals/` (tryCatch,
  bind, conclude, env, refine, atProp, atIndex, jsonCodec).
- `packages/plgg/README.md` Module Categories - the section map.

## Implementation Steps

1. **Atomics & Basics** — the branded scalar types and their `asX`/`isX`
   casters/guards; the type-driven-design rationale (define the type first).
2. **Disjunctives** — `Option<T>` and `Result<T,E>` in depth: constructors,
   `map`/`mapErr`/`chain`/`match*`/`getOr`, and the typeclass instances they
   expose.
3. **Contextuals** — `Box<Tag, Content>`, `Some`/`None`, `Ok`/`Err`: the tagged
   carriers and `box`/`pattern`/`isBox`/`hasTag`.
4. **Flowables** — the composition core: `cast` (sync validation chain), `proc`
   (async pipeline, **precise inferred error union + `Defect`**), `pipe`/`flow`,
   `match` (with the `X$` matchers), `hold`. Each with a signature table and a
   tested example.
5. **Functionals** — `tryCatch` (throw→`Result`, defaults to `Defect`), `bind`,
   `conclude`, `env`, `refine`, `atProp`/`atIndex`, `jsonCodec`/`decodeJson`.

## Considerations

- **Match `proc`'s current shape.** Document that `proc` infers the precise
  per-step error union (`E₁ | … | Defect`), not `Error`/`unknown`, and that
  explicit type args now mean raw step-return types. (`packages/plgg/src/Flowables/proc.ts`)
- **Pull every example from specs.** Each combinator has a colocated `*.spec.ts`;
  lift inputs→outputs from there so the docs can't drift.
- **Curate, don't dump.** This is the *guided* surface; defer the exhaustive
  symbol-by-symbol listing to the T8 auto-generated reference, and link to it.
  ([[20260617214004-guide-api-autogen-and-ci]])
- Pairs with T4 (structures/errors/abstracts); together they cover plgg core.
  Keep page structure consistent across both. ([[20260617214000-guide-plgg-core-structures-errors]])

## Final Report

Development completed as planned. Wrote `values-effects.md` as a curated,
by-category tour (Atomics, Basics, Disjunctives, Contextuals, Flowables,
Functionals) with signature tables and source-verified examples; links to the
concept pages rather than restating them, and defers the exhaustive listing to
the T8 auto-gen reference.

### Discovered Insights

- **Insight**: Atomics and Basics differ structurally — Atomics (`Num`,
  `SoftStr`, `Int`, `Time`, …) are *bare* TS primitives (`type Num = number`)
  given an `asX`/`isX` validation seam, whereas Basics (`Str = Box<"Str",
  string>`, `Float`, the ranged ints) are *branded boxes* that carry proof of
  refinement in the type. Documenting the two categories together would blur
  this; the page keeps them as separate sections.
- **Insight**: `proc` and `cast` differ in their error model — `cast` is sync
  and its error channel is always `InvalidError`; `proc` is async and infers a
  *union* of every step's error plus `Defect`. This is why validation chains use
  `cast` and effectful chains use `proc`.
