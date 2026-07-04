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
} from "plggpress/framework";
import { style_, p } from "plggpress/framework/style";
import { frontmatter } from "plggpress/framework";
import { type MarkdownDoc } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { href } from "plggpress/Href/usecase/href";
import { shell } from "plggpress/theme/shell";
import { baseCss } from "plggpress/theme/baseCss";
import { themeToggleCss } from "plggmatic";
import {
  schemeCss,
  metricCss,
  reducedMotionCss,
} from "plggmatic/style";

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
  headings: [],
};

// The home page: no H1, so `<title>` falls back to the
// site title.
const homeDoc: MarkdownDoc = {
  frontmatter: frontmatter(some("home")),
  firstHeading: none(),
  body: bodyFixture,
  links: [],
  slugs: [],
  headings: [],
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

test("composes plggmatic framework blocks ahead of baseCss, then the body's collected CSS", () => {
  const sheet = collectCss(bodyFixture);
  return all([
    // the fixture really contributes an atomic rule
    check(sheet, toContain("padding")),
    // plggmatic's scheme properties lead (so every later
    // var(--pm-*) resolves): the light :root + dark override
    // (the scheme block emits tokens in `colors` order, so
    // it opens on --pm-primary-base), and a neutral surface
    // definition is present
    check(
      rendered,
      toContain(":root{--pm-primary-base:"),
    ),
    check(
      rendered,
      toContain("html.dark{--pm-primary-base:"),
    ),
    check(rendered, toContain("--pm-surface:")),
    // the appearance-toggle chrome block is composed in
    check(rendered, toContain(".pm-theme-toggle{")),
    // then the bespoke layout sheet (a stable baseCss marker)
    check(rendered, toContain(".vp-app{")),
    // and the body's atomic CSS closes the single
    // <style> block, byte-for-byte
    check(rendered, toContain(`${sheet}</style>`)),
  ]);
});

test("the composed stylesheet is escape-safe (no <, >, & reach the SSR text node)", () => {
  // Rebuild the framework+bespoke payload exactly as shell
  // composes it (collectCss is escape-safe by construction).
  // A single unescaped < / > / & here would be silently
  // mangled by the text escaper, so it must be absent from
  // the input — the byte-for-byte survival contract.
  const composed =
    schemeCss +
    metricCss +
    reducedMotionCss +
    themeToggleCss +
    baseCss;
  return all([
    check(composed, not(toContain("<"))),
    check(composed, not(toContain(">"))),
    check(composed, not(toContain("&"))),
    // no child combinator crept into the emitted selectors
    check(collectCss(bodyFixture), not(toContain(">"))),
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
