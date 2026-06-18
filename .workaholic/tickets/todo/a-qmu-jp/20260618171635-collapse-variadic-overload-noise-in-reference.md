---
created_at: 2026-06-18T17:16:35+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Collapse variadic-overload noise in the API reference

## Overview

Even after hiding the backing instance objects, the reference is still a "long
article": the variadic combinators `pipe` / `cast` / `proc` / `flow` each declare
**~20 typing overloads** (the 2-arg … 21-arg arities), and TypeDoc renders
**every** overload with a full "Type Parameters: A, B, C … S" block. That alone
is ~226 "Type Parameters" sections on the plgg page — pure noise, since the type
parameters are just positional placeholders with no constraints.

A user needs **one** representative signature per combinator plus the
description, not 20 near-identical overloads. Goal: collapse this so each
variadic function shows a single signature, and strip the remaining low-value
rendering (the per-symbol GitHub "Defined in" source links).

This continues the reference-quality line of work
([20260618102232-condense-curate-api-reference.md](.workaholic/tickets/archive/work-20260617-214017/20260618102232-condense-curate-api-reference.md),
[20260618154727-hide-instance-objects-from-api-reference.md](.workaholic/tickets/archive/work-20260617-214017/20260618154727-hide-instance-objects-from-api-reference.md)).

## Key Files

- `packages/plgg/src/Flowables/pipe.ts`, `cast.ts`, `proc.ts`, `flow.ts` — each
  has ~20 `export function <fn><…>(…): …;` overload declarations followed by the
  implementation. The first overload carries the JSDoc.
- `packages/guide/typedoc.base.json` — TypeDoc/markdown options;
  add `disableSources: true` (drop the "Defined in: github…" lines) and compact
  formats (`parametersFormat: "table"`, `indexFormat: "table"`). Note:
  `typeParametersFormat` is **not** a valid option in this plugin version — do not
  add it (it errors); the overload-tagging below is what removes the type-param
  walls.
- `packages/guide/scripts/gen-api.mjs` — no change expected; it regenerates from
  the tagged source.

## Implementation Steps

1. **Keep one signature per combinator.** For `pipe`/`cast`/`proc`/`flow`, mark
   every overload declaration **except the first** `@internal` (insert a
   `/** @internal */` line before each later `export function <fn>…` declaration,
   including the implementation signature). With `excludeInternal` already on, the
   reference then shows only the first overload — a clean representative
   signature. Doc-only: the overloads remain in the `.d.ts` (no `stripInternal`),
   so variadic typing for users is unchanged.
   - This is mechanical and patternable (match `^export function <fn>\b`, tag all
     but the first occurrence). ~20 tags × 4 files.
2. **Enrich the first overload's doc** so the single shown signature is honest —
   note the function is variadic (accepts a value/seed followed by 2–N functions),
   since only the 2-arg arity will be displayed.
3. **Strip source-link noise** in `typedoc.base.json` (`disableSources: true`) and
   set `parametersFormat`/`indexFormat` to `"table"` for density.
4. **Verify**: `npm run build` in `packages/guide`; confirm the plgg page's
   "Type Parameters" section count drops sharply (was ~226) and `pipe`/`cast`/
   `proc`/`flow` each show a single signature + description; the public API is
   still present. Run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` (the edits
   are comment-only, so both must still pass).

## Considerations

- **`match` is already fine** — its overload explosion lived in the `MatchCont`
  interface, already `@internal` from the earlier ticket; the `match` function
  itself has a single curried signature. (`packages/plgg/src/Flowables/match.ts`)
- **Doc-only, not breaking.** `@internal` only affects TypeDoc here; the `.d.ts`
  keeps every overload so `pipe(a, b, c, …)` still type-checks for consumers.
- **Showing one arity is acceptable.** The 2-arg signature plus a "variadic"
  note conveys the shape; the full arity ladder is an implementation detail of
  the typing, not user-facing vocabulary.
- **Operation policy (`standards:operation`).** Generation stays reproducible and
  regenerated on build by the deploy workflow.
