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
import { notFound } from "plgg-press/theme/notFound";

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/getting-started" },
  ],
  sidebar: [],
  social: [],
  home: none(),
  dev: { allowedHosts: [] },
};

const rendered = renderToString(notFound(config));

test("renders through the full document shell", () =>
  all([
    check(
      rendered.slice(0, 21),
      toBe("<!doctype html><html>"),
    ),
    check(rendered, toContain("<head>")),
    check(rendered, toContain("<body><main>")),
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

test("includes base-prefixed nav links", () =>
  all([
    check(rendered, toContain("<nav")),
    check(
      rendered,
      toContain('href="/plgg/getting-started"'),
    ),
    // and a base-prefixed home link in the body
    check(rendered, toContain('href="/plgg/"')),
  ]));

test("marks no nav entry current (off-route sentinel)", () =>
  check(
    rendered,
    not(toContain('aria-current="page"')),
  ));
