---
created_at: 2026-07-18T21:05:17+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission: modernize-plgg-bundle
---

# Make the externals-table shape an explicit tested contract

## Overview

When an already-built plgg-bundle ESM dist is **inlined** into a downstream app
bundle, its inner `__externals` table maps `"<spec>": __extN`. The flatten-time
key rewrite (`src/domain/usecase/collectModules.ts` `replaceExternalKey`,
lines ~279–300) rewrites those keys by **string-splitting on the exact TS-printer
shape** `"<spec>": __ext` — a coupling to a printer incidental (PR #66 concern).
If the emitter's spacing/quoting ever drifts, the rewrite silently misses and
the inner lookup falls into the dynamic-import fallback (`plgg_1.box is not a
function`).

Make the emitted registry/externals-table shape an **explicit, tested
contract** shared by the emitter and the flatten rewrite, so the rewrite no
longer pattern-matches printer output.

## Key files

- `packages/plgg-bundle/src/domain/usecase/emitBundle.ts` — `externalImports`
  (`import * as __ext${i} from "<spec>";`, lines ~148–158), `externalTable`
  (`const __externals = { "<spec>": __ext${i}, ... }`, lines ~164–176),
  `extVar` (lines ~181).
- `packages/plgg-bundle/src/domain/usecase/collectModules.ts` —
  `replaceExternalKey` / `replaceRequire` (the flatten-time rewrite that must
  follow the id rewrite).
- Existing pins to migrate: `emitBundle.spec.ts` (lines ~101–125, literal
  emitted strings) and `collectModules.spec.ts` (~120–162, inlined-dist
  fixture).

## Approach

- Define the externals-table shape **once** — a small module owning the key
  form and the entry-emit form (e.g. `externalKey(spec)` and
  `externalEntry(spec, i)`), used by both `emitBundle` (to write the table) and
  `collectModules` (to find/rewrite keys). The rewrite matches the **contract
  function's output**, not a hand-written `"<spec>": __ext` literal.
- Pin the contract with a test that both the emitter and the rewrite reference,
  so a change to the emitted shape that would break flattening fails a unit
  test rather than a downstream app bundle at runtime.

## Quality Gate

- **Acceptance:** the flatten-time key rewrite no longer contains a hand-written
  `"<spec>": __ext` string literal coupled to the printer; it is expressed
  through the shared contract. A test asserts that emit output and rewrite
  input agree, and that changing the emitted table shape breaks that test (not
  a silent runtime failure).
- **Regression preserved:** the existing inlined-dist flatten fixture in
  `collectModules.spec.ts` still passes (the app-bundle inlining that produced
  `plgg_1.box is not a function` stays fixed); `emitBundle.spec.ts` pins are
  updated to reference the contract.
- A real inline-a-built-dist build still produces a working `__externals`
  lookup; `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:implementation` / `type-driven-development` (the shape is a
  contract, not a stringly-typed incidental); `objective-documentation`.
- `workaholic:design` / `vendor-neutrality`.
