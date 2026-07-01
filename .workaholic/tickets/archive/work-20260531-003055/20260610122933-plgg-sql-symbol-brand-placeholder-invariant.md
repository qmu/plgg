---
created_at: 2026-06-10T12:29:33+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort: 0.5h
commit_hash: 392a954
category: Changed
depends_on:
---

# Harden Sql fragment brand and placeholder/param invariant

## Overview

Two defense-in-depth hardening items in the `plgg-sql` builder. The builder is
injection-safe by construction today (tagged template → positional `?`
placeholders → driver-bound params; no raw-SQL/escape API), and the strict
no-`as`/`any` rule makes both items unreachable from typed code — but each
weakens a guarantee that should hold by construction, not by caller discipline.

1. **Forgeable `Sql` brand (LOW):** `isSql` checks only a string `__tag ===
   "Sql"` via `isBoxWithTag`. A plain object — e.g. one parsed from attacker
   JSON — shaped `{"__tag":"Sql","content":{"text":"1 OR 1=1; --","params":[]}}`
   passes `isSql` and its `content.text` is **spliced verbatim into the SQL
   text** (the one and only path data crosses into SQL text). Guarded by a
   forgeable string tag rather than a module-private brand.
2. **Nullish interpolation breaks the placeholder==param invariant (LOW):**
   interpolating `null`/`undefined` (only reachable via a type hole) emits a
   chunk with **no** `?` yet still pushes a param, so `text` placeholder count
   and `params` length disagree and every later param shifts relative to its
   placeholder. With `node:sqlite` this fails closed (count mismatch throws), but
   a more lenient driver could bind shifted values.

## Key Files

- `packages/plgg-sql/src/Sql/model/Sql.ts` (`isSql` lines 50-51; `placeholderText` lines 57-59; nullish handling lines 98-112) — both fixes.
- `packages/plgg/src/Contextuals/Box.ts` (`isBoxWithTag` lines 122-125) — the structural tag check `isSql` delegates to.
- `packages/plgg-sql/src/Sql/model/Sql.spec.ts` — existing injection-safety assertions to extend.

## Implementation Steps

1. Brand `Sql` with a non-exported `Symbol` (or a class with a private field) and have `isSql` check that symbol, so a deserialized/forged object can never satisfy it. Defense-in-depth: also assert `typeof value.content.text === "string"` so a malformed box cannot concatenate `undefined` into the text.
2. Make the nullish interpolation path uphold the invariant: treat a nullish interpolation as `None` (emit `?` + `none()`), or reject it. Never let `text` placeholder count and `params` length diverge.
3. Tests: a forged plain object shaped like an `Sql` box is rejected by `isSql` and cannot splice text; placeholder count always equals params length, including the nullish case.

## Considerations

- **Preferring Rich Typing** (`standards:implementation`): a `Sql` value should be a true opaque brand whose only constructor is the tagged template — the symbol brand makes "this is genuinely a query fragment" machine-checkable rather than structurally spoofable. (`packages/plgg-sql/src/Sql/model/Sql.ts`)
- **Preferring Declarative Code**: the placeholder/param pairing is an invariant the builder should preserve by construction under composition (including nested fragments) — encode it so it cannot be violated, not just tested. 
- A symbol brand for `Sql` may motivate the same treatment for other `Box` tags if they guard a security boundary; scope this ticket to `Sql` and note the pattern. (`packages/plgg/src/Contextuals/Box.ts`)
- No LIKE-escape helper exists; `%`/`_` in bound values still act as wildcards (enumeration, not injection). Out of scope here — note for a future ticket if a LIKE use case appears.
- Strict no-`as`/`any`/`ts-ignore` (CLAUDE.md); keep coverage >90%.

## Final Report

Both hardening items done. tsc clean; plgg-sql 25 tests pass (2 new).

### Discovered Insights

- **Insight**: The symbol brand stamps via `Object.defineProperty(box("Sql")(c),
  SQL_BRAND, { value: true })` — non-enumerable, so it survives splicing (read by
  property, not spread) but never appears in `JSON.stringify`/spread, and `isSql`
  checks `SQL_BRAND in value` with no `as` (narrowed by `typeof === "object"` +
  `!== null`). A forged JSON box lacks the symbol → bound as a value, never
  spliced.
- **Insight**: The placeholder/param invariant now holds *by construction*: a
  single `normalized = values.map(v => v ?? none())` feeds **both** the text and
  params builders, so they can't diverge. The earlier bug came from text using
  `fromNullable(values[i])` (which dropped a nullish value) while params lifted it
  to `[some(null)]`. `??` (not `fromNullable`) preserves falsy-but-valid binds
  (`0`/`false`/`""`); only `null`/`undefined` become a NULL param.
  **Context**: `packages/plgg-sql/src/Sql/model/Sql.ts`.
