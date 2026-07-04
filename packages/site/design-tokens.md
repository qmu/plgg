# Design tokens

Alongside the [color scheme](/color-scheme), plggmatic tokenizes the **non-color** half of the design system: the prose type scale, a closed font-weight set, the responsive breakpoints, the shell geometry, the z-index bands, and a framework-owned reduced-motion block. Every scale is a **closed union with an exhaustive `Record`**, so a missing value or a typo (`typeStyle("h5")`, `minWidth("md")`) is a compile error — the same type-driven discipline the color matrix uses. All values are lifted verbatim from the qmu.co.jp docs oracle, so the design system and the guide agree by construction.

## The type scale

Five prose roles — `h1`–`h4` and `body` — each carry a `size`, an (unitless, inheritance-safe) `lineHeight`, and a `weight`. Heading roles also carry a **compact** phone-column override. The `heading` and `prose` components draw from this one map (via the `typeStyle` atom), so the rendered scale can never drift from the token.

| Role | Size | Line-height | Weight | Compact (below `sm`) |
| --- | --- | --- | --- | --- |
| `h1` | `1.875rem` | `1.25` | 400 | `1.75rem` / `1.25` |
| `h2` | `1.5rem` | `1.3` | 400 | `1.375rem` / `1.3` |
| `h3` | `1.1875rem` | `1.45` | 400 | `1.125rem` (leading kept) |
| `h4` | `1.0625rem` | `1.5` | 400 | — |
| `body` | `1rem` | `1.75` | 400 | — |

A calm ~1.25 modular scale on a 1rem body, every heading at weight 400 — not the generic `2xl`/600 plggmatic headings rendered before. The compact overrides are the oracle's `max-width:639px` block, recorded here as one source so the theme port emits the media query from the same map. `h3` narrows its size but keeps its base leading, so its compact `lineHeight` is `None` (absence is an `Option`, never a sentinel).

```ts
import { style_, typeStyle } from "plggmatic/style";
import { div, text } from "plgg-view";

// font-size 1.875rem, line-height 1.25, font-weight 400 —
// one atom, drawn from the token.
const title = div([style_(typeStyle("h1"))], [text("Design tokens")]);
```

## Font weights

A closed set of the only three weights the oracle uses — a union, not a free `number`, so `weight(700)` is a compile error until a component earns the weight.

| Token | Value | Where |
| --- | --- | --- |
| `regular` | 400 | body copy, every heading |
| `medium` | 500 | links, wordmark, active nav, buttons |
| `semibold` | 600 | section / group titles, table headers |

The `weight` atom shadows plgg-view's untyped `weight(number)` with this `FontWeight`-typed one. `lineHeight` is the unitless line-height atom plgg-view lacks.

```ts
import { style_, weight, medium, lineHeight, measure } from "plggmatic/style";
import { div, text } from "plgg-view";

const lede = div(
  [style_(weight(medium), lineHeight("1.75"), measure)],
  [text("Tokens, not magic numbers.")],
);
```

## Spacing

Spacing is a **recorded decision, not a new scale**: plgg-view's `spacing(step) = step × 0.25rem` is already the house scale (`p`, `m`, `gap`, `w` all ride it), so plggmatic adopts it as-is rather than cloning it. The readable content measure is the one spacing-shaped value promoted to a named token — `measure`, the `48rem` shell metric below — because `prose` and the ported theme both reach for it by name.

## Breakpoints

Three named breakpoints. They are **TS constants with query builders, never `--pm-*` custom properties** — a `@media` query cannot resolve `var()`, so these boundaries are build-time values baked into the CSS-emitting code. A contributor "cleaning up" breakpoints into custom properties would silently break every media query; this is a hard constraint, recorded here.

| Breakpoint | Width | `minWidth` | `maxWidth` (boundary − 1px) | Gates |
| --- | --- | --- | --- | --- |
| `sm` | 640px | `(min-width:640px)` | `(max-width:639px)` | the phone-column heading block |
| `snap` | 900px | `(min-width:900px)` | `(max-width:899px)` | the example's multi-column snap strip |
| `lg` | 1024px | `(min-width:1024px)` | `(max-width:1023px)` | the docs sidebar app-shell |

Two shells, two boundaries — `lg` gates the docs shell, `snap` the example's column strip. They are different layouts with different collapse physics and are deliberately **not** unified.

## Shell metrics

The fixed dimensions of the app shell. Unlike breakpoints these **are** emitted as `--pm-*` custom properties (they are `var()`-consumable — used in ordinary declarations, not `@media`), so the shell CSS and the `prose` measure reference them through `metricVar` and one edit retunes the geometry. They are scheme-independent, so `metricCss` emits a single `:root{…}` block with no `html.dark` override.

| Metric | Value | Custom property | Job |
| --- | --- | --- | --- |
| `shell-max` | 1440px | `--pm-shell-max` | the centred shell cap |
| `sidebar` | 256px | `--pm-sidebar` | the nav column width |
| `measure` | 48rem | `--pm-measure` | the prose reading measure |
| `rail` | 48px | `--pm-rail` | the chrome-rail thickness |

## Z-index bands

A closed, semantically named set — spaced so a new layer can slot between two without renumbering — that replaces the ad-hoc integers otherwise scattered across a shell.

| Band | Value | Layer |
| --- | --- | --- |
| `content` | 1 | a sticky in-pane header inside a scrolling column |
| `chrome` | 30 | the sticky mobile bar |
| `backdrop` | 40 | the dimmed scrim behind an open drawer |
| `overlay` | 50 | the off-canvas drawer itself |

```ts
import { style_, zIndex, minWidth, maxWidth, metricVar, metricCss, reducedMotionCss } from "plggmatic/style";
import { div, text } from "plgg-view";

const scrim = div([style_(zIndex("overlay"))], [text("A modal layer")]);

// Breakpoints are strings for CSS-emitting code; metrics
// are custom properties emitted once; reduced motion is
// composed in, not re-authored.
const responsiveCss =
  metricCss +
  `@media ${minWidth("lg")}{.app{max-width:${metricVar("shell-max")}}}` +
  `@media ${maxWidth("sm")}{.app{padding:0}}` +
  reducedMotionCss;
```

## Reduced motion

`reducedMotionCss` is a framework-owned `@media (prefers-reduced-motion:reduce)` block that drops smooth scrolling back to `auto` on the page and on the independently scrolling `main` column. The **recorded rule**: any motion plggmatic ships — hover/press feedback today, whatever the scheduler animates tomorrow — must be authored so this one block disables it. Motion is opt-out by default (WCAG 2.3.3), and the block is escape-safe so it survives the SSR text escaper byte-for-byte.

## The hover affordance is derived, not a token

The qmu signature inverted-pill hover (a link or active nav leaf swapping to a solid fill with an inverted label) needs a fill and its label ink. Under the monochrome default this pair is **exactly** the matrix's on-base-label convention, so no dedicated token ships:

- `hover` := `primary-base` (the ink);
- `hover-ink` := neutral `surface` (the label).

i.e. the pill is `neutral surface` painted on `primary-base` — the same two values a `primary-base` fill already labels with. A dedicated token would be a synonym, so D9's earned-place rule keeps it derived. Two revisit triggers are recorded in the token model: the palette-override API (a non-black `primary-base` turns the monochrome pill into a colored one), and the theme port (if any inverted surface fails AA under the derivation, the contrast spec is the arbiter). This theme idiom is distinct from the *component* hover feedback (an opacity dim), which governs a control dimming under the pointer — both stand, neither adds a hover color token.
