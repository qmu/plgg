# Color scheme

plggmatic's color is a closed, typed vocabulary of **roles**, not a free palette. Eight roles cover the seed set's needs; each has a value in both the light and dark **schemes**. An unknown role is a compile error, and every text/surface pairing is checked against WCAG 2.2 AA contrast by a test that computes the ratio — the palette cannot ship a failing pair.

## The eight roles

The current default is a warm editorial palette — ink on cream paper with a pine accent — tuned so every text/surface pairing clears AA. Literal values live in exactly one place (the palette map); everything else references them by role.

| Role | Job | Light | Dark |
| --- | --- | --- | --- |
| `surface` | page / pane background | `#fffdf7` | `#1c1a17` |
| `surface-2` | secondary panel — code, table header, sunken rail | `#f0e9d8` | `#262320` |
| `primary` | accent fill — buttons, active markers | `#1f6b54` | `#1f6b54` |
| `primary-text` | label that sits on `primary` | `#fbfaf3` | `#fbfaf3` |
| `text` | body & heading ink | `#2a241d` | `#ece7dd` |
| `muted` | secondary ink — captions, metadata | `#6b6459` | `#a39a8a` |
| `border` | hairline dividers & pane edges | `#e6dcc8` | `#38332b` |
| `danger` | error text & destructive affordances | `#b23a2a` | `#ec8175` |

The `primary` / `primary-text` button pair is held constant across schemes — a stable brand affordance whose label contrast holds in both.

## Custom properties, one `dark` class

The recorded decision behind the scheme: color atoms resolve to `var(--pm-*)` custom properties rather than literal hex, so a single `dark` class on `<html>` reschemes the entire tree without re-styling any element. `schemeCss` emits the values as `:root{…}` plus a `html.dark{…}` override.

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

## Contrast is a gate, not a guideline

Every text role is checked on every surface it sits on, in both schemes, against the WCAG 2.2 AA floor for normal text (4.5:1). A spec computes each ratio; a value that dips below the floor fails the build. These are the measured ratios of the current palette:

| Pairing | Light | Dark |
| --- | --- | --- |
| `text` on `surface` | 15.09:1 | 14.09:1 |
| `text` on `surface-2` | 12.68:1 | 12.68:1 |
| `muted` on `surface` | 5.75:1 | 6.24:1 |
| `muted` on `surface-2` | 4.83:1 | 5.62:1 |
| `danger` on `surface` | 5.85:1 | 6.58:1 |
| `danger` on `surface-2` | 4.91:1 | 5.93:1 |
| `primary-text` on `primary` | 6.10:1 | 6.10:1 |

`muted` is deliberately darker than a decorative gray so secondary text clears the floor on both surfaces — not just the 3:1 large-text allowance — and dark-mode `danger` is lightened to a coral for the same reason. The tightest pairing (`muted` on `surface-2` at 4.83:1) still passes; because the gate is computed, tuning a value that would break it is caught before it ships.
