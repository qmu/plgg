import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { none } from "plgg";
import { renderToString } from "plgg-view";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { navBar } from "plgg-press/theme/navBar";

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/getting-started" },
    { text: "Concepts", link: "/concepts/" },
  ],
  sidebar: [],
  social: [],
  home: none(),
  dev: { allowedHosts: [] },
};

const rendered = renderToString(
  navBar(config, "/getting-started"),
);

test("renders a labelled <nav> landmark", () =>
  all([
    check(rendered, toContain("<nav")),
    check(
      rendered,
      toContain('aria-label="Main navigation"'),
    ),
  ]));

test("routes every nav link through href(base)", () =>
  all([
    check(
      rendered,
      toContain('href="/plgg/getting-started"'),
    ),
    check(
      rendered,
      toContain('href="/plgg/concepts/"'),
    ),
    // the site-title brand links to the base root
    check(rendered, toContain('href="/plgg/"')),
    check(rendered, toContain(">plgg Guide<")),
  ]));

test("marks exactly the active entry current", () =>
  all([
    check(
      rendered,
      toContain('aria-current="page"'),
    ),
    // exactly one entry carries the marker
    check(
      rendered.split('aria-current="page"')
        .length - 1,
      toBe(1),
    ),
  ]));

test("marks no entry current when path is off-route", () =>
  check(
    renderToString(navBar(config, "/nowhere")),
    not(toContain('aria-current="page"')),
  ));

test("renders the right-aligned group with the theme toggle and mobile menu control", () =>
  all([
    // links + controls share a right-aligned group
    check(rendered, toContain("vp-nav-right")),
    // the appearance toggle button + its sun/moon glyphs
    check(
      rendered,
      toContain('class="vp-theme-toggle"'),
    ),
    check(rendered, toContain("vp-sun")),
    check(rendered, toContain("vp-moon")),
    // the CSS-only mobile sidebar control
    check(
      rendered,
      toContain('for="vp-menu-toggle"'),
    ),
  ]));
