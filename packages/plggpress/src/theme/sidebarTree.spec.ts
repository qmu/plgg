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
import { type SidebarGroup } from "plggpress/SiteConfig/model/SiteConfig";
import { sidebarTree } from "plggpress/theme/sidebarTree";

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
      // a link-less header WITH children (a nested,
      // always-expanded subgroup)
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

test("renders an always-expanded tree — no <details> collapse, no script", () =>
  all([
    check(
      rendered,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
    // the top-level group is a plain always-visible header
    check(
      rendered,
      toContain('class="vp-group-title"'),
    ),
    // no disclosure widgets, no client script
    check(rendered, not(toContain("<details"))),
    check(rendered, not(toContain("<summary"))),
    check(rendered, not(toContain("<script"))),
  ]));

test("base-prefixes every leaf link, including nested ones", () =>
  all([
    check(
      rendered,
      toContain('href="/plgg/getting-started"'),
    ),
    // the nested subgroup's children are always rendered
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

test("marks exactly the active leaf current with the inverted-pill class", () =>
  all([
    check(
      rendered,
      toContain('aria-current="page"'),
    ),
    check(
      rendered,
      toContain('class="vp-sidebar-link"'),
    ),
    // only one entry carries the active marker
    check(
      rendered.split('aria-current="page"')
        .length - 1,
      toBe(1),
    ),
  ]));

test("renders a link-less child-less item as plain text, not a link", () =>
  check(
    rendered,
    toContain(">Reference</span>"),
  ));
