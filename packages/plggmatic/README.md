# plggmatic

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

A **column-oriented UI design framework** on the plgg family: a typed light/dark
**color scheme** (roles resolved through `var(--pm-*)` custom properties, so one
`dark` class reschemes the whole tree), **layout combinators** (`row` / `column`
/ `pane`) composed like element builders take `(parts, children)`, and
**fundamental components** as pure `(props) => Html<Msg>`. Styling is data —
atoms composed through [plgg-view](../plgg-view/)'s `style_`, gathered by
`collectCss`. No layout config object and no runtime to boot.

The vocabulary is one word per concept: **Column**, **Pane**, **Alignment**,
**Token**, **Scheme**. The design system is emergent — seeded minimal, one
recorded rule per component.

This is the UI design framework, canonical in this monorepo since `6d7a832`
(decision D13). See the documentation site in [`packages/site/`](../site/) and
the workbench demo in [`packages/plggmatic-example/`](../plggmatic-example/).

**Disambiguation — "plggmatic" has two historical meanings.** (a) A retired
2026-06/07 *app-framework facade*, absorbed into
[`plggpress/src/framework/`](../plggpress/src/framework/) in `31fdee9`; archived
tickets and their "rewire map" tables describe *that* plggmatic — do not apply
them to this package. (b) *This* package — the UI design framework — re-imported
at `6d7a832` and canonical here (D13). This note is the single source of the
distinction; other sites link here rather than repeating it.

## Palette override & scheme persistence

The color system is a closed role×variant matrix (see the
[color-scheme docs](../site/color-scheme.md)) with a **monochrome default**.
Two consumer seams:

- **Override** — `defaultPalette` is the shipped monochrome palette; an app
  validates its own brand colors with `asPalette` (`unknown` → `Result`, a
  missing scheme/token/bad-hex is an `Err` naming the path) and emits the CSS
  with `schemeCssOf`. `contrastRatio` runs the same WCAG math the phase-1 gate
  uses so an override can be audited. Atoms and `var(--pm-*)` are untouched.
- **Persistence** — the contract is framework-owned: one storage key
  `appearanceStorageKey` = **`vp-appearance`** (preserved per D16), one
  mechanism **`html.dark`**, a no-FOUC `appearanceInitScript` +
  `injectAppearanceScript`, a pure `decideScheme`, and an `applyScheme` effect
  helper. Every consumer schemes identically — no per-app key drift.
