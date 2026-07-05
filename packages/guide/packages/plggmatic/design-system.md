# Design system

The design half of
[plggmatic](/packages/plggmatic/): a typed color
scheme, non-color design tokens, layout combinators,
and appearance persistence. Styling is data — atoms
composed through [plgg-view](/packages/plgg-view)'s
`style_`, gathered by `collectCss` — and every color
resolves through a `var(--pm-*)` custom property, so
one `dark` class on `<html>` reschemes the whole tree.

## Writing an app with it

The reference app's stylesheet assembly
(`packages/plggmatic-example/src/app.ts`) — the
framework emits its own CSS; the app adds only
identity chrome:

```typescript
import * as sx from "plggmatic/style";

export const appCss =
  `body{margin:0;` +
  `background:var(--pm-surface);` +
  `color:var(--pm-text);}` +
  `.ex-brand{position:fixed;` +
  `z-index:${sx.zValue("chrome")};}` +
  sx.metricCss + // shell geometry tokens
  sx.schemeCss + // the --pm-* scheme variables
  sx.chromeCss + // multi-column chrome
  demoCss;
```

Layout and components come from the same package —
`row` / `column` / `pane` combinators take
`(parts, children)` like element builders, and
components are pure `(props) => Html<Msg>`; the
landmark panes (`navPane`, `mainPane`, `asidePane`)
carry their ARIA roles.

## Vocabulary

All on the `plggmatic/style` subpath (kept off the
root barrel because utility names like `p` and `text`
collide with Html element builders):

- **Color scheme** — a closed role×variant matrix:
  `Color` (semantic roles plus a neutral scale),
  `Scheme` (light/dark), `colorHex` / `colorVar`,
  `schemeCss` (the shipped monochrome default) and
  `schemeCssOf` (emit CSS for an override palette).
- **Palette override** — `defaultPalette` is the
  shipped monochrome palette; `asPalette` validates a
  brand palette (`unknown` →
  [`Result`](/concepts/result); a missing scheme,
  missing token, or bad hex is an `Err` naming the
  path); `contrastRatio` runs the same WCAG math the
  framework's own build gate uses, so an override can
  be audited before shipping.
- **Non-color tokens** — `typeScale` / `typeRoles` /
  `fontWeights` (typography), `breakpoints` /
  `minWidth` / `maxWidth`, `metrics` / `metricValue` /
  `metricVar` (shell geometry), `zBands` / `zValue`
  (z-index bands), and `reducedMotionCss`.
- **Themed atoms** — `bg`, `color`, `textColor`,
  `border`, `borderColor`, `outline` (the
  scheme-aware `var(--pm-*)` versions; they shadow
  plgg-view's literal-hex utilities of the same
  names), plus `typeStyle`, `weight`, `lineHeight`,
  `zIndex`, `measure`.
- **Syntax tokens** — `syntaxKinds` /
  `syntaxPalette` / `syntaxVar` / `syntaxCss`, the
  `tok-*` hues [plgg-highlight](/packages/plgg-highlight)
  output is colored with.
- **Appearance** — `appearanceStorageKey` (the single
  storage key, `vp-appearance`), `decideScheme` (pure:
  stored preference + OS preference → `Scheme`),
  `appearanceInitScript` / `injectAppearanceScript`
  (a no-FOUC boot script), and `applyScheme` (the
  `html.dark` effect helper).

## Why it exists

The color system is a **closed** role×variant matrix:
every role×scheme pair is a required palette entry, so
a missing color is a compile or validation error, not
a silently-wrong render — and the WCAG contrast pairs
are asserted by a build-time spec in the framework
itself. The default is monochrome black/white;
branding is an override through `asPalette`, so the
framework never needs editing to reskin an app.

Appearance persistence is **framework-owned** on
purpose: one storage key, one mechanism (`html.dark`),
one no-FOUC script. Every consumer schemes
identically, and apps cannot drift into incompatible
per-app persistence keys.

## How it's organized

`Style/model` holds the token types and palettes
(scheme, hexColor, palette, typography, breakpoint,
metric, zIndex, syntax, appearance); `Style/usecase`
emits CSS (`schemeCss`, `chromeCss`, `metricCss`,
`appearanceScript`). `Layout` and `Component` build on
the tokens. The design-system gallery — color scheme,
design tokens, forms, multi-column, pane alignment —
is a separate plggpress site in the repository's
`packages/site/` directory (the dogfood SSG reader),
not part of this guide.
