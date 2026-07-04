# Color scheme

plggmatic's color is a closed, typed vocabulary — not a free palette. It is a **matrix**: five semantic **roles** (`primary`, `success`, `danger`, `warning`, `info`) × four **variants** (`base`, `text`, `surface`, `border`), plus a five-member **neutral scale** — 25 tokens, each with a value in both the light and dark **schemes**. An unknown token (`bg("blurple")`) — or a bare role without a variant (`bg("primary")`) — is a compile error, and every text/surface pairing across the whole matrix is checked against WCAG 2.2 AA contrast by a test that computes the ratio, so the palette cannot ship a failing pair.

## The matrix

Each semantic role carries four variants:

- **`base`** — the solid accent fill (a button, an active marker). Its on-fill label is the neutral `surface` token, inverted per scheme (the qmu inverted-pill affordance).
- **`text`** — the role's ink, used as foreground on the neutral surfaces and on the role's own tinted `surface`.
- **`surface`** — the role-tinted panel background (a callout body).
- **`border`** — the role's edge hue (held to the WCAG 1.4.11 non-text 3:1 floor).

| Role | Light `base` / `text` / `surface` / `border` | Dark `base` / `text` / `surface` / `border` |
| --- | --- | --- |
| `primary` | `#111111` / `#111111` / `#f6f6f7` / `#767679` | `#f4f4f4` / `#f4f4f4` / `#202127` / `#8a8a90` |
| `success` | `#047857` / `#065f46` / `#ecfdf5` / `#059669` | `#34d399` / `#34d399` / `#022c22` / `#34d399` |
| `danger` | `#b91c1c` / `#991b1b` / `#fef2f2` / `#dc2626` | `#f87171` / `#f87171` / `#450a0a` / `#f87171` |
| `warning` | `#92400e` / `#78350f` / `#fffbeb` / `#b45309` | `#fbbf24` / `#fbbf24` / `#451a03` / `#fbbf24` |
| `info` | `#1d4ed8` / `#1e40af` / `#eff6ff` / `#2563eb` | `#60a5fa` / `#60a5fa` / `#172554` / `#60a5fa` |

## The neutral scale

| Neutral | Job | Light | Dark |
| --- | --- | --- | --- |
| `surface` | page / pane background | `#ffffff` | `#1b1b1f` |
| `surface-2` | secondary panel — code, table header, sunken rail | `#f6f6f7` | `#202127` |
| `text` | body & heading ink | `#1f1f22` | `#dfdfe4` |
| `muted` | secondary ink — captions, metadata | `#5b5b61` | `#8d8d95` |
| `border` | hairline dividers & pane edges | `#ededee` | `#262629` |

## The default is monochrome

The shipped default is the **qmu.co.jp monochrome palette**: black `#111111` on white `#ffffff` in light, near-white on near-black in dark — the same values already carried in plggpress's theme, adopted here so the design system and the docs site agree. `primary-base` is the ink, and its on-base label is the neutral `surface` (white on black in light, dark on white in dark). The dark neutral inks are the oracle's translucent whites flattened over the dark `surface` to single solid hex (a recorded, imperceptible divergence — the token layer requires `#rrggbb`). `info` has no qmu value (plggpress renders info callouts in brand), so its blue is provisional until a component consumer exercises it.

**Doctrine note.** `token.ts` began as a deliberate *seed*, not a catalog — each role earned its place from a concrete consumer. Decision **D9** (roadmap 2026-07-04) amends that: the role×variant *shape* is fixed up front as roadmap vocabulary, and the earned-place rule now applies one tier up — new **roles** (`secondary`, `tertiary`) are still earned by a concrete consumer and are deliberately not shipped yet. Adding one is a single union-member edit whose fallout is driven entirely by `tsc`.

## Custom properties, one `dark` class

Color atoms resolve to `var(--pm-*)` custom properties rather than literal hex, so a single `dark` class on `<html>` reschemes the entire tree without re-styling any element. `schemeCss` emits the values as `:root{…}` plus a `html.dark{…}` override — 25 variables per scheme.

```ts
import {
  bg,
  textColor,
  border,
  p,
  rounded,
  style_,
  schemeCss,
} from "plggmatic/style";
import { div, text } from "plgg-view";

const card = div(
  [style_(bg("surface"), textColor("text"), border, p(4), rounded("md"))],
  [text("A themed surface")],
);

// `:root{--pm-surface:…}html.dark{--pm-surface:…}` —
// inject once into the document <style>.
const baseColorCss = schemeCss;
```

`bg`, `textColor`, and `border` from `plggmatic/style` are the themed atoms — they emit `var(--pm-*)` and shadow plgg-view's literal-hex utilities of the same name. The spacing and radius utilities (`p`, `rounded`) come straight from plgg-view.

## Overriding the palette

The monochrome default is exported as `defaultPalette`; an app supplies its own brand colors through a **typed, caster-validated** `Palette`. `asPalette` takes config-borne `unknown` and returns a `Result` — a missing scheme, a missing token, or a malformed hex is an `Err` naming the failing path (e.g. `dark.danger-border`), so a palette can never ship a hole. Emit the scheme CSS from any validated palette with `schemeCssOf`; the atoms and `var(--pm-*)` references are untouched, so an override changes only the emitted values, never a component.

```ts
import {
  asPalette,
  schemeCssOf,
  contrastRatio,
} from "plggmatic/style";

// brandColorCss :: SoftStr, from a boundary-validated palette
const brandColorCss = matchResult(
  () => schemeCss,
  (palette) => schemeCssOf(palette),
)(asPalette(configPalette));
```

`asPalette` validates **shape, not taste** — a low-contrast override is the app's deliberate choice. Use the exported `contrastRatio` (the same WCAG 2.x math the phase-1 gate runs) to audit an override against the 4.5:1 / 3:1 floors yourself.

## Scheme persistence: `vp-appearance` + `html.dark`

plggmatic owns the persistence contract so every consumer schemes identically:

- **One storage key** — `appearanceStorageKey` = `vp-appearance` (preserved verbatim per D16, so visitors keep their choice across the plggpress→plggmatic theme cutover; it does not follow the `--pm-*` rename).
- **One mechanism** — a single `dark` class on `<html>` (`html.dark`); no attribute variants.
- **No FOUC** — `appearanceInitScript` is a dependency-free inline script that, before first paint, reads the key else `matchMedia('(prefers-color-scheme: dark)')` and adds `dark` to `documentElement`. `injectAppearanceScript(html)` inserts it before `</head>` (after the SSR escaper; a page without `</head>` passes through unchanged).
- **Pure decision** — `decideScheme(stored, prefersDark)` is DOM-free (stored `dark`/`light` wins, else the OS preference), and `applyScheme(scheme, root, storage)` flips the class and persists at the app's effect seam, swallowing storage failures (private mode).

## Contrast is a gate, not a guideline

Every text pairing across the matrix is checked in both schemes against the WCAG 2.2 AA floor for normal text (4.5:1), and every semantic-role border against the 1.4.11 non-text floor (3:1). A spec computes each ratio; a value that dips below the floor fails the build. A representative slice of the measured ratios of the shipped monochrome palette:

| Pairing | Light | Dark |
| --- | --- | --- |
| `text` on `surface` | 16.44:1 | 12.93:1 |
| `text` on `surface-2` | 15.22:1 | 12.09:1 |
| `muted` on `surface` | 6.74:1 | 5.21:1 |
| `muted` on `surface-2` | 6.24:1 | 4.87:1 |
| neutral `surface` on `primary-base` (on-base label) | 18.88:1 | 15.61:1 |
| `primary-text` on `surface` (link) | 18.88:1 | 15.61:1 |
| `success-text` on `success-surface` | 7.29:1 | 7.88:1 |
| `danger-text` on `danger-surface` | 7.60:1 | 5.84:1 |
| `warning-text` on `warning-surface` | 8.75:1 | 8.97:1 |
| `info-text` on `info-surface` | 8.01:1 | 5.78:1 |
| `success-border` on `surface` (3:1 floor) | 3.77:1 | 8.93:1 |
| `danger-border` on `surface` (3:1 floor) | 4.83:1 | 6.21:1 |

The tightest text pairing (`muted` on `surface-2` at 4.87:1 in dark) still clears the 4.5:1 floor, and the tightest border (`success-border` at 3.77:1 in light) clears 3:1. Because the gate is computed over every role×variant pairing in both schemes, tuning a value that would break any of them is caught before it ships.
