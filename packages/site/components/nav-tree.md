# Nav tree

`navTree` is the recursive, config-driven navigation tree — the docs sidebar you are reading is this shape.

## Recorded rule

`navTree` emits **list markup only** — a `<ul>` of `<li>`, nested for children — and does not wrap itself in a `<nav>` landmark. The landmark is owned by the [pane alignment](/pane-alignment) system's `navigation` pane it sits inside, so the two never produce nested or duplicate nav landmarks (the higher-level pane policy wins). The leaf whose `href` equals the active path is marked `aria-current="page"` at build time; a header node with no link renders as plain text. Zero client JavaScript.

## Usage

`href` is an `Option`: `some` is a link, `none` is a group header.

```ts
import { navTree, type NavItem } from "plggmatic";
import { some, none } from "plgg";

const items: ReadonlyArray<NavItem> = [
  {
    label: "Guide",
    href: none(),
    children: [
      { label: "Getting started", href: some("/getting-started"), children: [] },
      { label: "Color scheme", href: some("/color-scheme"), children: [] },
    ],
  },
];

const tree = navTree(items, "/getting-started");
```

Place the returned tree in a `navigation` pane's `body`, and the pane supplies the `<nav>` landmark around it.
