# plgg-ui

The UI engine currently retained in the plgg monorepo. It
provides the typed layout, component, form, declaration,
scheduler, renderer, and style surfaces that were extracted
from the former local plggmatic package.

Today it is still an independent package because more than
one consumer depends on it:

- [plggpress](/packages/plggpress) uses its theme/runtime
  surface.
- [plgg-cms](/packages/plgg-cms) uses it for admin UI
  declaration and rendering surfaces.
- The standalone plggmatic repository consumes it through
  the published npm package.

## Surfaces

- **Runtime** — `Component`, `Declare`, `Form`, `Layout`,
  `Render`, and `Schedule` modules for building typed UI
  declarations and rendering them through plgg-view HTML.
- **Style** — the `plgg-ui/style` subpath: theme tokens,
  scheme-aware CSS emitters, metric/color helpers,
  appearance scripts, and theme-toggle helpers.

## Boundary decision

`plgg-ui` depends only on [plgg](/packages/plgg/) and
[plgg-view](/packages/plgg-view). It does not depend on
plggpress or plgg-cms.

Prag CMS-specific composition now belongs in
[plgg-cms](/packages/plgg-cms). The `plgg-ui` package is
retained only as a shared plgg-family UI engine because
plggpress and the standalone plggmatic repository still
consume the published package.
