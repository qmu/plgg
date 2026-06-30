---
created_at: 2026-07-01T01:33:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on:
---

# Integral counts, ids & indices: wide `number` / `Num` → `Int`

## Overview

The number axis is the second half of the repo's loose-type debt. Just as
`SoftStr` is too wide for a non-empty string, bare `number` / `Num` is too wide
for a value that is **integral by construction**. The monorepo sweep found
**~18 sites** across 4 packages where an identity, counter, or index field is
typed `number`/`Num` but can only ever hold an integer — and several already
*hand-check* integrality at runtime (`Number.isInteger`), which means the brand
just moves an existing check to the type boundary. `Int` already exists at
`packages/plgg/src/Atomics/Int.ts`.

This ticket is independent of the string-axis tickets and can run in parallel.
It is the **foundation of the number axis** and should land before its sibling
`[20260701013303-refine-number-to-sized-uint-resource-quantities.md]` (sized
unsigned ints), which builds on the integral-brand mindset. The bounded-real
sibling `[20260701013304-refine-opacity-number-to-float.md]` is independent.

## Scope (this ticket)

In scope: domain fields/params/returns that are **integers** by construction —
ids, monotonic counters, list indices/column widths, auto-increment row ids,
and an integer query codec — refined `number`/`Num` → `Int`.

Out of scope (sweep-excluded): `compareVersion`'s `-1|0|1` comparator return and
the zero-pad-width/array-index **combinator internals** in plgg / plgg-db-migration
(not domain fields); the `plgg-foundry` `ProfileFoundry.ts:22 interests` /
`TodoFoundry.ts:15 nextId` example-demo fields (low confidence); `plgg-view`
fractional half-step spacing (`token.ts:8`, `utilities.ts:26` — `Int` is unsafe
there). Bounded *unsigned/sized* quantities (ports, status, byte caps, durations)
belong to the sized-uint ticket, not here.

## Key Files

- `packages/example/src/Todo.ts:9` — `id: number` → `Int` (minted from a
  monotonic counter). The example app is the densest cluster: also `Toast` id,
  the `nextId`/`toastSeq` counters, the `expanded` id array, and every `id`/`delta`
  field on the `Msg` union — all non-negative/small-signed integers → `Int`.
- `packages/plgg-router/src/Routing/usecase/queryCodec.ts:53` — `queryInt():
  FieldCodec<number>` → `FieldCodec<Int>`. The decode path **already enforces
  `Number.isInteger`**, so the brand simply surfaces an existing invariant.
- `packages/plgg-sql/src/Db/model/Db.ts:18` — `lastInsertId: Option<Num>` → `Int`
  (a rowid is integral). Also `ExecResult` DML **row counts** → `Int` (known
  non-negative integers).
- `packages/plgg-md/src/Block/usecase/parseBlocks.ts:101` — `indentOf(): number`
  returns a `.length` column width → `Int`; the `ListMark.indent` field likewise.
  (The tokenizer cursor/index seams in the same file are internals — leave them.)

## Implementation Steps

1. **example app first** (densest, self-contained): change `Todo.id`/`Toast` id,
   the counters, the `expanded` array element type, and the `Msg` `id`/`delta`
   fields to `Int`. Mint ids via `asInt`/the `Int` constructor at the counter, and
   thread `Int` through the update/view functions.
2. **plgg-router `queryInt`:** make the codec produce `FieldCodec<Int>` —
   construct the `Int` in the same place the existing `Number.isInteger` guard
   runs (the check becomes the brand's construction site, not a separate step).
3. **plgg-sql:** `lastInsertId` → `Int` and `ExecResult` row counts → `Int`,
   constructed where the driver result is adapted.
4. **plgg-md:** `indentOf` return + `ListMark.indent` → `Int`; construct from the
   `.length` width.
5. Per package: `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green.
6. Add a spec proving the `Int` boundary **rejects** a fractional/`NaN` value the
   prior `number` field accepted (e.g. `queryInt` decoding `"1.5"`).

## Considerations

- **Move the check, don't duplicate it.** Where a runtime guard already asserts
  integrality (`queryInt`), the `Int` constructor should *replace* the loose
  return — not sit alongside the old `number` plumbing.
- **Distinguish internal indices from domain integers.** Tokenizer cursors and
  generic array indices are combinator internals and stay `number`; only fields
  that are part of a *domain model* (an id, a persisted count, a list indent)
  become `Int`.
- **Signedness:** keep `Int` here even where values are non-negative; the
  *unsigned/sized* tightening (e.g. counts that are also bounded) is the sibling
  ticket's job — don't pre-empt it.
- **No escape hatches:** all `Int` construction via `asInt`/the `Int` ctor; never
  `as`/`any`/`ts-ignore`.
- Tooling: `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh`; Prettier 50.

## Quality Gate

The `/drive` approval gate requires **all** of:

1. **tsc + tests green:** `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
   passing, >90% coverage thresholds intact.
2. **No new escape hatches:** zero `as`/`any`/`ts-ignore`; all bridges via
   `asInt`/`isInt`.
3. **Boundary actually tightened:** a spec shows an `Int` field/codec rejects a
   fractional or `NaN` value that the prior `number`/`Num` field accepted.
4. **Loose-type count drops:** in-scope id/counter/index fields are no longer
   bare `number`/`Num`; any left loose matches a Scope exclusion.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — refine to the
  precise numeric brand; no `as`/`any`/`ts-ignore`; Option/Result.
- `workaholic:implementation` / `policies/type-driven-design.md` — replace runtime
  integrality guards with a type boundary that fails at compile time.
- `workaholic:implementation` / `policies/directory-structure.md` — changes stay
  in existing `model/` + `usecase/` role files.
