import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { some, none } from "plgg";
import {
  type Html,
  div,
  text,
  collectCss,
  renderToString,
} from "plggmatic";
import { style_, p } from "plggmatic/style";
import { frontmatter } from "plggmatic";
import { type MarkdownDoc } from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { href } from "plggpress/Href/usecase/href";
import { shell } from "plggpress/theme/shell";

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
    // the root carries the `vp` scope class
    check(
      rendered,
      toContain('<body class="vp">'),
    ),
    check(
      rendered.slice(-14),
      toBe("</body></html>"),
    ),
  ]));

test('wraps the pre-rendered body in a slot <div> under <body class="vp">', () =>
  all([
    // the opaque body rides into the typed shell through
    // the slot <div>, directly inside <body class="vp">
    // (page.ts owns any <main>, the shell adds none)
    check(
      rendered,
      toContain('<body class="vp"><div'),
    ),
    check(rendered, not(toContain("<main"))),
    check(
      rendered,
      toContain("Hello body</div></div></body>"),
    ),
  ]));

test("inlines baseCss ahead of the body's collected CSS in one <style>", () => {
  const sheet = collectCss(bodyFixture);
  return all([
    // the fixture really contributes an atomic rule
    check(sheet, toContain("padding")),
    // the static theme sheet is injected (a stable
    // baseCss marker + a custom property)
    check(rendered, toContain(".vp-app{")),
    check(rendered, toContain("--vp-brand")),
    // and the body's atomic CSS closes the single
    // <style> block, byte-for-byte
    check(
      rendered,
      toContain(`${sheet}</style>`),
    ),
  ]);
});

test("derives <title> from firstHeading when present", () =>
  check(
    rendered,
    toContain("<title>Getting Started</title>"),
  ));

test("falls back to config.title when firstHeading is None", () =>
  check(
    renderToString(
      shell(config, homeDoc, bodyFixture),
    ),
    toContain("<title>plgg Guide</title>"),
  ));

test("emits only a base-routed canonical <link>, no external stylesheet", () =>
  all([
    // canonical is routed through href(config.base)
    check(
      rendered,
      toContain(
        `<link rel="canonical" href="${href(
          "/plgg/",
        )("/")}" />`,
      ),
    ),
    // the restyle inlines the theme, so no external
    // stylesheet link remains
    check(
      rendered,
      not(toContain('rel="stylesheet"')),
    ),
  ]));
