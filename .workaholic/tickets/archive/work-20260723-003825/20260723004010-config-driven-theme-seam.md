---
created_at: 2026-07-23T00:40:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260723004000-adopt-plggmatic-column-layout.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Make the doc-site theme config-driven, not composition-root-bound

## Overview

The monochrome qmu.co.jp theme is currently hard-bound at the
composition root (`theme/baseCss.ts` / `shell.ts` bind `defaultTheme`
directly). Expose it through `SiteConfig` so a site selects or
overrides its theme (palette) as validated config, using plggmatic's
existing `pragmaticThemeWithPalette` / `asPalette` override API rather
than editing source. Default stays the B&W qmu palette.

## Key files

- `packages/plggpress/src/SiteConfig/model/SiteConfig.ts:86` — the
  decoded config; add an optional validated `theme`/`palette` field
  (Result-cast, no `as`).
- `packages/plggpress/src/theme/shell.ts:47`,
  `src/theme/baseCss.ts:18` — the composition-root `defaultTheme`
  binds to replace with the config-resolved theme.
- `packages/plggmatic/src/brand.ts:44` — `pragmaticTheme` /
  `pragmaticThemeWithPalette(unknown)` the override entry point.

## Approach

- Add an optional `theme` (or `palette`) input to the `SiteConfig`
  authoring façade and its `asSiteConfig` caster, validated through
  plggmatic's `asPalette` so a bad brand palette fails naming the
  offending path (e.g. `dark.danger-border`), never silently.
- Thread the resolved theme from config to the shell/baseCss emitters
  instead of the hard-bound `defaultTheme`.
- Absent config ⇒ the existing B&W qmu default, unchanged.

## Quality Gate

- **Acceptance:** a spec sets a `SiteConfig` with a palette override
  and asserts the emitted CSS reflects it; a spec with no theme config
  asserts the unchanged B&W default; an invalid palette is rejected
  with a path-named error.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` / type-driven — theme override is a
  Result-cast over `unknown`, validation is the cast, no escape hatch.
- `workaholic:design` — the qmu monochrome aesthetic is the default;
  overriding it is opt-in config, not a source edit.
