import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type Html,
  div,
  text,
  collectCss,
  renderToString,
} from "plgg-view";
import { style_, p } from "plgg-view/style";
import { frontmatter } from "plgg-md";
import { type MarkdownDoc } from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";
import { shell } from "plgg-press/theme/shell";

// A pre-rendered Markdown body fixture carrying one
// atomic `css()` rule, so `collectCss` yields a known
// non-empty atomic-utility sheet (`.cHASH{padding:…}`)
// with no `<`/`>`/`&` to survive SSR escaping intact.
const bodyFixture: Html<never> = div(
  [style_(p(3))],
  [text("Hello body")],
);

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [],
  sidebar: [],
  social: [],
  home: none(),
  dev: { allowedHosts: [] },
};

// A normal page: its first H1 drives the `<title>`.
const pageDoc: MarkdownDoc = {
  frontmatter: frontmatter(none()),
  firstHeading: some("Getting Started"),
  body: bodyFixture,
  links: [],
  slugs: [],
};

// The home page: no H1, so `<title>` falls back to the
// site title.
const homeDoc: MarkdownDoc = {
  frontmatter: frontmatter(some("home")),
  firstHeading: none(),
  body: bodyFixture,
  links: [],
  slugs: [],
};

const rendered = renderToString(
  shell(config, pageDoc, bodyFixture),
);

test("emits a leading doctype + complete <html> document", () =>
  all([
    check(
      rendered.slice(0, 21),
      toBe("<!doctype html><html>"),
    ),
    check(rendered, toContain("<head>")),
    check(rendered, toContain("</head>")),
    check(
      rendered,
      toContain("<body><main>"),
    ),
    check(
      rendered.slice(-14),
      toBe("</body></html>"),
    ),
  ]));

test("wraps the pre-rendered body in a slot <div> inside <main>", () =>
  all([
    check(
      rendered,
      toContain("<main><div"),
    ),
    check(
      rendered,
      toContain(
        "Hello body</div></div></main></body>",
      ),
    ),
  ]));

test("inlines the body's collected CSS byte-for-byte in a single <style>", () => {
  const sheet = collectCss(bodyFixture);
  return all([
    // the fixture really contributes an atomic rule
    check(sheet, toContain("padding")),
    // and the <style> text equals it exactly
    check(
      rendered,
      toContain(`<style>${sheet}</style>`),
    ),
  ]);
});

test("derives <title> from firstHeading when present", () =>
  check(
    rendered,
    toContain(
      "<title>Getting Started</title>",
    ),
  ));

test("falls back to config.title when firstHeading is None", () =>
  check(
    renderToString(
      shell(config, homeDoc, bodyFixture),
    ),
    toContain("<title>plgg Guide</title>"),
  ));

test("routes every <link> href through href(config.base)", () =>
  all([
    check(
      rendered,
      toContain(
        `<link rel="stylesheet" href="${href(
          "/plgg/",
        )("/assets/style.css")}" />`,
      ),
    ),
    check(
      rendered,
      toContain(
        '<link rel="canonical" href="/plgg/" />',
      ),
    ),
  ]));
