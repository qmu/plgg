# Pane alignment

plggmatic models a screen as an ordered **row** of vertical **Columns**, each holding **Panes** — landmark content regions (`nav`, `main`, `aside`). The alignment system is **compositional**: three small builders (`row`, `column`, `pane`) that take `(parts, children)` exactly like element builders take `(attributes, children)`. There is no layout config object and no interpreter — sizing, scroll, and responsiveness are style parts you compose and stylesheet rules you own.

## The pieces

- **`row(parts, columns)`** — the screen as a horizontal strip. Contributes `display:flex` and the `pm-row` hook, nothing else.
- **`column(parts, panes)`** — one vertical track. Contributes the column flow and the `pm-col` hook; its width is a composed atom: `basis("220px")` for a fixed track, `fluid` for the one that fills the remaining row.
- **`pane(role)(parts, children)`** — a landmark region: `navigation` → `<nav>`, `main` → `<main>`, `complementary` → `<aside>` (also pre-bound as `navPane`, `mainPane`, `asidePane`). The accessibility skeleton is in the composition itself.

Options become atoms, structure becomes nesting:

```ts
import { row, column, navPane, mainPane } from "plggmatic";
import { basis, fluid, p, style_ } from "plggmatic/style";
import { renderToString, collectCss, text } from "plgg-view";

const screen = row(
  [],
  [
    column(
      [basis("220px")],
      [navPane([p(2)], [text("nav")])],
    ),
    column(
      [fluid],
      [mainPane([p(4)], [text("reading")])],
    ),
  ],
);

const html = renderToString(screen);
const css = collectCss(screen);
```

The composed atoms travel **with** the elements — `collectCss` gathers them into content-hashed atomic rules, the same channel every other plggmatic style utility uses. No second stylesheet layer to assemble.

## Hooks, not options

Each builder exposes a stable class hook (`pm-row`, `pm-col`, `pm-pane`), and any string part you pass joins the same class list (`column(["reader", fluid], …)`). What atoms cannot express — `@media` collapse, per-column viewport scroll, snap strips — you write in your own stylesheet against those hooks. The framework does not guess your breakpoints.

Because `style_` is the **sole class authority**, builders merge their base parts and yours into one call; never attach a separate `class` attribute next to style parts — pass the hook as a string part instead.

## Ownership split with the color scheme

The [color scheme](/color-scheme) layer owns the `--pm-*` custom-property block; the composed atoms and your hook-targeting rules reference `var(--pm-*)`, so every column and pane reschemes with one `dark` class. Concatenate the scheme block, your own rules, and the body's collected atomic CSS into one `<style>`.
