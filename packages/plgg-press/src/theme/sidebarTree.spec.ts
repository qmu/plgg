import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import { type SidebarGroup } from "plgg-press/SiteConfig/model/SiteConfig";
import { sidebarTree } from "plgg-press/theme/sidebarTree";

const groups: ReadonlyArray<SidebarGroup> = [
  {
    text: "Guide",
    items: [
      {
        text: "Getting Started",
        link: some("/getting-started"),
        items: [],
      },
      // a link-less, child-less grouping leaf
      {
        text: "Reference",
        link: none(),
        items: [],
      },
      // a link-less header WITH children (a nested
      // disclosure)
      {
        text: "Concepts",
        link: none(),
        items: [
          {
            text: "Pipelines",
            link: some("/concepts/pipelines"),
            items: [],
          },
          {
            text: "Option",
            link: some("/concepts/option"),
            items: [],
          },
        ],
      },
    ],
  },
];

const rendered = renderToString(
  sidebarTree(
    groups,
    "/concepts/option",
    "/plgg/",
  ),
);

test("renders a CSS-only <details> disclosure tree", () =>
  all([
    check(rendered, toContain("<details")),
    check(rendered, toContain("<summary")),
    // a labelled sidebar landmark, no client script
    check(
      rendered,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
    check(rendered, not(toContain("<script"))),
  ]));

test("base-prefixes every leaf link", () =>
  all([
    check(
      rendered,
      toContain('href="/plgg/getting-started"'),
    ),
    check(
      rendered,
      toContain(
        'href="/plgg/concepts/pipelines"',
      ),
    ),
    check(
      rendered,
      toContain('href="/plgg/concepts/option"'),
    ),
  ]));

test("marks the active leaf and opens its ancestors", () =>
  all([
    check(
      rendered,
      toContain('aria-current="page"'),
    ),
    // the top group is always open and the nested
    // "Concepts" group opens because it holds the
    // active leaf — two open disclosures
    check(
      rendered.split('open=""').length - 1,
      toBe(2),
    ),
  ]));

test("renders a link-less child-less item as plain text, not a link", () =>
  check(
    rendered,
    toContain(">Reference</span>"),
  ));
