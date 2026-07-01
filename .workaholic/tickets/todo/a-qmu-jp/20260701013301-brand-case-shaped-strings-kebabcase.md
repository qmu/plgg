---
created_at: 2026-07-01T01:33:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on: [20260701013300-refine-softstr-to-str-domain-strings.md]
---

# Brand case-shaped string fields → `KebabCase`

## Overview

A subset of the repo's loose string fields are not merely non-empty but
**case-constrained**: their values are always kebab-case tokens. `KebabCase`
already exists as a refinement in `packages/plgg/src/Basics/KebabCase.ts`, but
these fields stop at bare `string`/`SoftStr`. The monorepo sweep isolated
**~13 sites** across 4 packages where branding `KebabCase` is provably correct
and high-value — most importantly because some of them must **match a key that is
already `KebabCase`**, so the brand makes the lookup type-aligned with the table
it indexes.

This is the precision tail of the string axis: smaller and tighter than
`[20260701013300-refine-softstr-to-str-domain-strings.md]`, and it **depends on
it** — `KebabCase` is a refinement of the non-empty-string idea, and the
surrounding fields in these files should already be branded `Str` before the
case-shaped ones are narrowed further (so the foundry/opcode work isn't fighting
two migrations at once).

## Scope (this ticket)

In scope: string fields whose values are a fixed kebab-case vocabulary or must
match an existing `KebabCase` key — refined `string`/`SoftStr` → `KebabCase`.

Out of scope: free-text/empty-capable strings (covered or excluded by the `Str`
ticket), and `plgg-bundle`'s npm-package `name`
(`discoverWorkspace.ts:22`) — flagged **low confidence**; include only if it
falls out cleanly, otherwise leave it.

## Key Files

- `packages/plgg-foundry/src/Alignment/model/Process.ts:13` — `action: string` →
  `KebabCase`. **Must match `Processor.name`, which is already `KebabCase`** —
  branding aligns the opcode with its dispatch table.
- `packages/plgg-foundry/src/Alignment/model/Switch.ts:14` — `action: string` →
  `KebabCase` (must match `Switcher.name`, already `KebabCase`).
- `packages/plgg-foundry/src/Alignment/...` — operation `name`/`next` references
  documented as kebab-case identifiers across the Assign/Process/Switch/Ingress/
  Egress Obj schemas + NameTable aliases; brand the ones that are genuinely the
  opcode/operation-id vocabulary (not free register payloads).
- `packages/plgg-highlight/src/Render/usecase/highlight.ts:45` — `tokenClass():
  SoftStr` returns fixed `tok-<kind>` kebab literals → `KebabCase`.
- `packages/plgg-view/src/Style/model/Style.ts:10` — `prop: SoftStr` CSS property
  name → `KebabCase` (also `CssRule.prop` and `decl()`). CSS **values** stay free
  text (excluded).

## Implementation Steps

1. **Confirm the dependency landed:** the surrounding `Str` migration for these
   files (foundry names, highlight class output, view style props) should be in
   before narrowing to `KebabCase`, so each field moves `SoftStr → Str → KebabCase`
   cleanly rather than in conflicting passes.
2. **plgg-foundry opcodes:** change `action`/operation-id fields to `KebabCase`;
   the dispatch tables (`Processor.name`/`Switcher.name`) are already `KebabCase`,
   so lookups become same-typed. Construct via `asKebabCase` at the Obj-decode /
   alignment-ingestion boundary.
3. **plgg-highlight:** `tokenClass` returns `KebabCase`; the `tok-*` literals are
   built from the token-kind brand, so construct the `KebabCase` once at the
   render seam.
4. **plgg-view:** `Style.prop` / `CssRule.prop` / `decl()` parameter → `KebabCase`;
   leave the value side free text.
5. Per package: `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh` green.
6. Add a spec proving `asKebabCase` **rejects** a non-kebab literal (e.g.
   `"Process"`, `"tok Foo"`) that the prior `string`/`SoftStr` field accepted.

## Considerations

- **The opcode↔table alignment is the real payoff** — once `action` and
  `Processor.name` are the same branded type, a malformed/empty opcode is a
  compile error, and the matcher can't be handed a value the table could never
  contain. Prioritize the foundry sites.
- **Don't brand register/variable payloads** unless they are genuinely the
  kebab opcode vocabulary; arbitrary register addresses and values are not
  case-shaped and belong (if anywhere) in the `Str` ticket.
- **No escape hatches:** `KebabCase` construction goes through `asKebabCase`;
  never `as`/`any`/`ts-ignore` to satisfy the brand.
- Tooling: `scripts/tsc-plgg.sh` / `scripts/test-plgg.sh`; Prettier 50.

## Quality Gate

The `/drive` approval gate requires **all** of:

1. **tsc + tests green:** `scripts/tsc-plgg.sh` clean, `scripts/test-plgg.sh`
   passing, >90% coverage thresholds intact.
2. **No new escape hatches:** zero `as`/`any`/`ts-ignore`; all `KebabCase`
   bridges via `asKebabCase`/`isKebabCase`.
3. **Boundary actually tightened:** a spec shows the `KebabCase` field rejects a
   non-kebab string the prior field accepted; for the foundry sites, a spec (or
   type-level proof) shows `action` and `Processor.name`/`Switcher.name` are now
   the same branded type.
4. **Loose-type count drops:** the in-scope case-shaped fields are no longer
   `string`/`SoftStr`; remaining loose fields match a Scope exclusion.

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — refine to the
  precise branded type; no `as`/`any`/`ts-ignore`; Option/Result.
- `workaholic:implementation` / `policies/type-driven-design.md` — align the
  opcode brand with its dispatch table so mismatches fail at compile time.
- `workaholic:implementation` / `policies/directory-structure.md` — changes stay
  in existing `model/` + `usecase/` role files.
