# plgg-ui

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **plgg-family UI engine**: the reusable seam extracted from
[`plggmatic`](../plggmatic/) (the `plggmatic-extraction-cut` trip). It carries the
engine + theme mechanism that both a docs framework
([`plggpress`](../plggpress/)) and a branded design system (`plggmatic`) consume,
with **no brand identity of its own** — the Pragmatic `--pm-*` design language is
a default that a consumer can replace.

Two export surfaces, mapped to the two things consumers use:

- **`plgg-ui`** (root barrel) — the **runtime** surface: `row`/`column`/`pane`
  layout combinators, the fundamental components as pure `(props) => Html<Msg>`,
  caster-parsed forms, the declarative admin vocabulary (`declare`/`menu`/
  `collection`/`action`), the TEA `schedule` scheduler, and the screen-mode
  renderers.
- **`plgg-ui/style`** (subpath) — the **theme** surface: plgg-view's inline-style
  utilities and token maps, plus the scheme-aware color atoms, the CSS emitters
  (`schemeCss`/`metricCss`/`syntaxCss`/`chromeCss`/`reducedMotionCss`), the token
  helpers (`colorVar`/`metricVar`/`maxWidth`/`minWidth`), the appearance script
  (`appearanceStorageKey`/`injectAppearanceScript`), and the `themeToggle*`
  family (`themeToggle`/`staticThemeToggle`/`themeToggleClass`/`themeToggleCss`).

The `./style` subpath boundary equals the surface boundary, so a consumer's theme
imports and runtime imports never cross. Built on [`plgg`](../plgg/) and
[`plgg-view`](../plgg-view/) only — it imports neither `plggpress` nor
`plggmatic` (dependency direction is one-way).

## Provenance

Re-homed byte-for-byte from `plggmatic` by ticket A1 of the
`plggmatic-extraction-cut` trip (`git mv` of the `Meta`/`Style`/`Layout`/
`Component`/`Form`/`Declare`/`Schedule`/`Render` trees). The shipped default is
still the monochrome `--pm-*` design language; ticket A3 parameterizes it as a
typed `Theme` so the values become a replaceable default and `plggmatic` owns the
branded contract.
