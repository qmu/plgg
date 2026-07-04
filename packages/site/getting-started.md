# Getting started

plggmatic ships as one package, `plggmatic`, with two entry points: the root barrel for `Html`-returning builders (layout and components) and the `plggmatic/style` subpath for the token utilities.

## Install

```bash
npm install plggmatic
```

plggmatic depends on the plgg family (`plgg`, `plgg-view`). Inside this monorepo those are resolved through `file:` links to each package's built `dist`; in your own project they install as normal dependencies.

## The two entry points

- `plggmatic` — the root barrel: the layout builders (`row`, `column`, `pane`/`navPane`/`mainPane`/`asidePane`) and the fundamental components (`button`, `textLink`, `heading`, `prose`, `themeToggle`, `navTree`).
- `plggmatic/style` — the token vocabulary: themed color utilities (`bg`, `textColor`, `border`, …) plus the plgg-view style utilities (`p`, `text`, `flex`, …) and the `schemeCss` custom-property block.

Style utilities live on their own subpath because their short names (`p`, `text`) would collide with the `Html` element builders on the root barrel.

## A first screen

A screen is composed, not configured: an ordered `row` of `column`s holding landmark `pane`s, with sizing as composed style atoms. Render it with plgg-view's `renderToString`; its atomic styles ride along and `collectCss` gathers them:

```ts
import { row, column, navPane, mainPane } from "plggmatic";
import { basis, fluid, p } from "plggmatic/style";
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

See [Pane alignment](/pane-alignment) for the builders and hooks, and the [color scheme](/color-scheme) page for the `--pm-*` block you concatenate ahead of the collected CSS.
