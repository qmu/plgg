---
created_at: 2026-07-23T00:40:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash:
category: Changed
depends_on: []
mission: plggpress-column-layout-and-voice-ai-editing
---

# Adopt plggmatic's column-oriented horizontal layout in plggpress

## Overview

plggpress renders its documentation navigation through plggmatic's
column-oriented horizontal layout — the demo1 reference model where
drilling a section opens a new column to the right and the top
bar/body width stays fixed as the strip grows and scrolls
horizontally beneath ("depth does not consume the viewport"). Today
plggpress has a fixed sidebar+content+rail shell (`theme/page.ts`)
and only *vendors a copy* of plggmatic's Style layer under
`themeSupport/`; it does not depend on the framework. Take a real
dependency on `plggmatic` and render through its `multiColumn` layout,
retiring the vendored copy. Preserve the qmu.co.jp monochrome
aesthetic.

## Key files

- `packages/plggpress/package.json` — add `plggmatic` as a
  `file:../plggmatic` dep; drop the reason for the vendored copy.
- `packages/plggpress/src/theme/page.ts:137` — the current 3-column
  doc shell to replace with plggmatic's column layout.
- `packages/plggpress/src/themeSupport/` — vendored plggmatic Style
  copy to retire in favour of the real `plggmatic/style` import.
- `packages/plggpress/src/router/pressRouter.ts` (`pageView`,
  `pageHandler`) — the single render path body wrap.
- `packages/plggmatic/src/Layout/usecase/combinators.ts` (`row`,
  `column`, `pane`), `src/Render/usecase/multiColumn.ts`,
  `src/styleEntry.ts` — the framework surfaces to consume.

## Approach

- Map the site's `SiteConfig` nav/sidebar tree onto plggmatic's
  column model: the nav is the left column; selecting a section opens
  its content/children as a column to the right. Reuse the plggmatic
  `multiColumn` renderer rather than reimplementing a strip.
- Replace the `themeSupport/` vendored Style with `plggmatic/style`
  (scheme/metric/chrome CSS emitters); the palette already matches
  (both are the qmu.co.jp monochrome port), so the visual result must
  stay black-and-white.
- Keep the single render path (build and dev share `pageHandler`); the
  static build must emit the same column-strip HTML as dev.
- Where consuming the framework forces overriding `pm-*` classes by
  name (the documented plggmatic theming smell), do NOT fix it here —
  file a concern pointing at
  `grow-plggmatic-as-the-reference-framework`.

## Quality Gate

- **Acceptance:** a built plggpress site renders its navigation as
  plggmatic's column strip — a spec asserts the rendered HTML has the
  column-strip structure (a `pm-row` with per-section `pm-col`
  columns), drilling a section adds a column, and the palette is
  monochrome. The body/top-bar width is invariant as depth grows.
- plggpress depends on the `plggmatic` package; the `themeSupport/`
  vendored copy is removed (or reduced to a thin re-export of
  `plggmatic/style`).
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green; >90%
  coverage; no `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` / horizontal-orientation UX — the doc site is a
  column strip in the qmu aesthetic, depth expressed by columns not by
  consuming the viewport.
- `workaholic:implementation` / `sacrificial-architecture` — render
  through the family's one general framework, not a per-product copy;
  the vendored Style copy is the drift to remove.
