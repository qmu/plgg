import {
  test,
  check,
  all,
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

test("the landing page is ordinary prose WITH the sidebar (qmu model)", () =>
  all([
    check(
      renderedHome,
      toContain("Article content here"),
    ),
    // with no top nav, the sidebar is the only path to
    // articles — the home page must carry it
    check(
      renderedHome,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
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
