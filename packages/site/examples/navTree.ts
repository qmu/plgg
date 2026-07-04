// Twin of the Nav tree page's code fence. `href` is an
// `Option`: `some` is a link, `none` is a plain group
// header. The item whose href equals the active path is
// marked `aria-current` at build time.
import { navTree, type NavItem } from "plggmatic";
import { some, none } from "plgg";

const items: ReadonlyArray<NavItem> = [
  {
    label: "Guide",
    href: none(),
    children: [
      {
        label: "Getting started",
        href: some("/getting-started"),
        children: [],
      },
      {
        label: "Color scheme",
        href: some("/color-scheme"),
        children: [],
      },
    ],
  },
];

export const tree = navTree(
  items,
  "/getting-started",
);
