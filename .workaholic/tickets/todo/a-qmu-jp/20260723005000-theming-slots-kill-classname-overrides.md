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
