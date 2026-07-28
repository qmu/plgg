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
  renderToString,
} from "plggpress/framework";
import {
  style_,
  p,
} from "plggpress/framework/style";
import {
  type MarkdownDoc,
  frontmatter,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { shell } from "plggpress/theme/shell";
import { page } from "plggpress/theme/page";

const config: SiteConfig = {
  title: "plgg Guide",
  description: "The plgg static guide",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/getting-started" },
  ],
  sidebar: [
    {
      text: "Guide",
      items: [
        {
          text: "Getting Started",
          link: some("/getting-started"),
          items: [],
        },
        {
          text: "Concepts",
          link: some("/concepts/"),
          items: [],
        },
      ],
    },
  ],
  social: [],
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
  srcExclude: none(),
  linkIgnore: none(),
  theme: none(),
};

const content: Html<never, "div"> = div(
  [style_(p(3))],
  [text("Article content here")],
);

const activePath = "/getting-started";

// A normal content page: navBar + sidebarTree + body.
const contentDoc: MarkdownDoc = {
  frontmatter: frontmatter(none()),
  firstHeading: some("Getting Started"),
  body: content,
  links: [],
  slugs: [],
  headings: [],
};

// The landing page: ordinary prose through the same
// shell (qmu.co.jp's model) — no hero variant exists.
const homeDoc: MarkdownDoc = {
  frontmatter: frontmatter(none()),
  firstHeading: none(),
  body: content,
  links: [],
  slugs: [],
  headings: [],
};

// The page layout composed exactly the way the build
// pipeline wires it: page() → shell().
const rendered = renderToString(
  shell(
    config,
    contentDoc,
    page(
      config,
      content,
      activePath,
      config.base,
    ),
  ),
);

const renderedHome = renderToString(
  shell(
    config,
    homeDoc,
    page(config, content, "/", config.base),
  ),
);

test("composes nav, sidebar and content inside the shell document", () =>
  all([
    check(
      rendered.slice(0, 21),
      toContain("<!doctype html><html>"),
    ),
    check(rendered, toContain("<nav")),
    check(
      rendered,
      toContain("Article content here"),
    ),
    check(
      rendered,
      toContain("<title>Getting Started</title>"),
    ),
  ]));

test("includes the sidebar with always-open section headers and an active-marked link", () =>
  all([
    check(
      rendered,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
    // top-level sections are always-open headers (no
    // collapse), so the group is a .vp-group-title,
    // not a <details>/<summary>
    check(
      rendered,
      toContain('class="vp-group-title"'),
    ),
    check(
      rendered,
      toContain('aria-current="page"'),
    ),
    check(rendered, not(toContain("<script"))),
  ]));

test("base-prefixes both nav and sidebar links", () =>
  all([
    check(
      rendered,
      toContain('href="/plgg/getting-started"'),
    ),
    check(
      rendered,
      toContain('href="/plgg/concepts/"'),
    ),
  ]));

test("the landing page is ordinary prose WITH the sections column (qmu model)", () =>
  all([
    check(
      renderedHome,
      toContain("Article content here"),
    ),
    // with no top nav, the sections column is the only
    // path to articles — the home page must carry it
    check(
      renderedHome,
      toContain('aria-label="Sections"'),
    ),
    // the SAME .vp-doc prose column as every article —
    // no hero variant exists
    check(
      renderedHome,
      toContain('class="vp-doc"'),
    ),
    // the wordmark marks the home route current
    check(
      renderedHome,
      toContain('aria-current="page"'),
    ),
    // the tree is always-expanded (no disclosure widget)
    check(
      renderedHome,
      not(toContain("<details")),
    ),
  ]));

// The count of plggmatic column tracks in a rendered page.
const columnCount = (rendered: string): number =>
  rendered.split('class="pm-col').length - 1;

// Extract a --pm-* scheme value from the emitted <style>.
const schemeValueOf = (
  html: string,
  token: string,
): string => {
  const needle = "--pm-" + token + ":";
  const at = html.indexOf(needle);
  return at < 0
    ? ""
    : (
        html
          .slice(at + needle.length)
          .split(";")[0] ?? ""
      ).trim();
};

// Whether a 6-digit #RRGGBB hex is grayscale (R==G==B).
const isGrayscaleHex = (hex: string): boolean => {
  const body = hex.replace("#", "");
  return (
    body.length === 6 &&
    body.slice(0, 2) === body.slice(2, 4) &&
    body.slice(2, 4) === body.slice(4, 6)
  );
};

test("renders the plggmatic column strip: a pm-row of pm-col columns", () =>
  all([
    // the strip is plggmatic's pm-row skeleton
    check(rendered, toContain('class="pm-row')),
    // carrying the qmu shell hook
    check(rendered, toContain("vp-app")),
    // with plggmatic pm-col columns (sections + content at
    // minimum, plus the drilled section here)
    check(rendered, toContain('class="pm-col')),
  ]));

test("drilling into a section adds a column to the strip", () =>
  all([
    // home is in no section: the sections column + the
    // content column, no drilled column
    check(columnCount(renderedHome), toBe(2)),
    // an in-section page drills the active section open as
    // an extra column to the right — depth is a COLUMN
    check(columnCount(rendered), toBe(3)),
    // and the drilled column carries the section's tree
    check(
      rendered,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
  ]));

test("the content column's width is invariant as depth grows (fixed-width, horizontal-scroll strip)", () =>
  all([
    // the content column is the same fixed-width vp-content
    // track whether or not a section column precedes it —
    // depth spends horizontal scroll, not the body width
    check(rendered, toContain("vp-content")),
    check(renderedHome, toContain("vp-content")),
    // the strip scrolls horizontally rather than shrinking
    // the body: the mechanism that keeps the width invariant
    check(rendered, toContain("overflow-x:auto")),
  ]));

test("the strip palette is monochrome (grayscale scheme tokens)", () => {
  const primary = schemeValueOf(
    rendered,
    "primary-base",
  );
  const surface = schemeValueOf(
    rendered,
    "surface",
  );
  return all([
    // both scheme tokens are present…
    check(primary.startsWith("#"), toBe(true)),
    check(surface.startsWith("#"), toBe(true)),
    // …and grayscale: R == G == B in the 6-digit hex
    check(isGrayscaleHex(primary), toBe(true)),
    check(isGrayscaleHex(surface), toBe(true)),
  ]);
});
