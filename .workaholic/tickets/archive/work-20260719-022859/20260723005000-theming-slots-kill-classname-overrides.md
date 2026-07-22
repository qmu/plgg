---
created_at: 2026-07-23T00:50:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
category: Added
depends_on: []
mission: grow-plggmatic-as-the-reference-framework
---

# Per-component theming slots so consumers restyle through tokens, not class names

## Overview

The primary framework-vs-example gap: demo1 restyles **16 framework
`pm-*` classes by name** (`demo1/styles.ts:5-14`), and the file's own
header calls this coupling "a smell" whose fix is "giving plggmatic
real theming hooks so a consumer restyles through tokens/slots rather
than by class name." Grow plggmatic so a consumer themes a component
through declared token/slot hooks, and migrate demo1 off the by-name
overrides. This is the general framework capability the reference
needs — expressed in the framework, not special-cased in the example.

## Key files

- `packages/plggmatic-example/src/demo1/styles.ts:5-20` — the 16
  by-name `pm-*` overrides and the "smell" header naming the fix.
- `packages/plggmatic/src/Style/model/theme.ts:57`,
  `src/Style/model/token.ts`, `src/brand.ts:44` — the token/Theme
  vocabulary to extend with per-component slots.
- `packages/plggmatic/src/Render/usecase/multiColumn.ts`,
  `src/Layout/usecase/combinators.ts` — where `pm-*` hooks are emitted;
  the seam to give named theming slots.
- `packages/plggmatic/src/Component/` — the components consumers
  restyle (`pane`, list, form, buttons, colhead).

## Approach

- Add a per-component theming slot/hook layer to `Theme` (declared
  token vocabulary per component), so a consumer supplies component
  styling as validated tokens/slots resolved into `var(--pm-*)`,
  never by overriding the framework class names.
- Migrate demo1 to restyle through the new slots and **remove the 16
  `pm-*` by-name overrides** in `demo1/styles.ts`; the exhibit must
  look identical (pure `#000`/`#fff`, spacing unchanged).
- Keep the change token-driven and Result-cast (reuse the `asPalette`
  pattern for any new validated inputs); no `as`/`any`.

## Quality Gate

- **Acceptance:** demo1 no longer overrides any framework `pm-*` class
  by name (grep-checkable: zero `.pm-` selectors in `demo1/styles.ts`);
  the same visual result is produced through declared theming slots,
  with a test asserting a consumer-supplied component token reaches the
  emitted CSS. The exhibit renders identically (monochrome, spacing
  preserved).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` / `sacrificial-architecture` — the
  framework's theming surface is the durable boundary; a consumer
  restyling by class name is drift the framework must absorb.
- `workaholic:design` — the qmu monochrome aesthetic is preserved; the
  slot layer changes *how* it is themed, not the look.

## Final Report

Added a per-component **theming-slot** capability to the framework and
migrated demo1's appearance overrides onto it.

**Framework (`packages/plggmatic`):**
- `Style/model/componentSlot.ts` — `ComponentSlot`, the closed set of
  themeable chrome pieces named by ROLE; `slotSelector(theme)(slot)`
  owns the `pm-*` selector strings (compound ones included), built from
  `theme.prefix`. The framework is now the single home of those class
  names.
- `Style/usecase/slotCss.ts` — `SlotStyle` (a consumer's restyle as
  data: slot + optional `scope`/`state`/`within` + declarations),
  `slotStyle` (trusted constructor) and `asSlotStyle` (validated caster,
  the `asPalette` pattern — escape-safe, brace-free, closed slot),
  `slotStyleCss`/`slotCss` emitters.
- `Theme` gains a `slots: ReadonlyArray<SlotStyle>` field (default `[]`,
  so the zero-config chrome is byte-unchanged); exported through
  `Style` + `styleEntry`. New files at 100% coverage.

**Reference (`packages/plggmatic-example`):**
- `demo1/theme.ts` — demo1's 30+ appearance overrides as declared
  `slotStyle` data (grouped `a,b{…}` rules split one-slot-each; the
  top-bar-button transitions stay app-side); `demo1Theme` carries them.
- `demo1/styles.ts` — the `pm-*` appearance overrides removed; only the
  app `bo-*` chrome, palette variables, and the app-owned desktop runway
  (the sibling runway ticket) remain.
- `demo1-main.ts` — injects `slotCss(demo1Theme)` after `chromeCss` +
  `demoCss` (the exact cascade position the old overrides held).

**Verification:** a rule-set reconstruction diff (original vs
`slotCss + demo1Css`) proved the two emit the **identical set of 75
atomic CSS rules** — visual identity guaranteed by construction (pure
`#000`/`#fff`, spacing unchanged). `./scripts/check-all.sh` green;
plggmatic coverage 99.1%/94.0%/99.0%/99.1% (>90%); no
`as`/`any`/`ts-ignore`.

**Note:** the acceptance "zero `.pm-` selectors in `demo1/styles.ts`"
is reached JOINTLY with the sibling runway ticket
(`20260723005010`), which owns the remaining `.pm-row`/per-column-width
overrides; this ticket removes all the *appearance* overrides the
mission enumerated.
