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
