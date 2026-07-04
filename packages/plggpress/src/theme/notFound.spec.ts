import { none } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { renderToString } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { notFound } from "plggpress/theme/notFound";

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/getting-started" },
  ],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
};

const rendered = renderToString(notFound(config));

test("renders through the full document shell", () =>
  all([
    check(
      rendered.slice(0, 21),
      toBe("<!doctype html><html>"),
    ),
    check(rendered, toContain("<head>")),
    check(
      rendered,
      toContain('<body class="vp">'),
    ),
    check(
      rendered.slice(-14),
      toBe("</body></html>"),
    ),
  ]));

test("derives a not-found <title>", () =>
  check(
    rendered,
    toContain("<title>Page not found</title>"),
  ));

test("renders the monochrome message with a base-prefixed home link", () =>
  all([
    check(rendered, toContain("vp-doc")),
    check(
      rendered,
      toContain(">Go to the home page<"),
    ),
    // the only link is base-prefixed home
    check(rendered, toContain('href="/plgg/"')),
  ]));

test("marks nothing current (off-route sentinel)", () =>
  check(
    rendered,
    not(toContain('aria-current="page"')),
  ));
