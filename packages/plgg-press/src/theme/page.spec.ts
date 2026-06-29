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
} from "plgg-view";
import { style_, p } from "plgg-view/style";
import {
  type MarkdownDoc,
  frontmatter,
} from "plgg-md";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { shell } from "plgg-press/theme/shell";
import { page } from "plgg-press/theme/page";

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
  home: none(),
  dev: { allowedHosts: [] },
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
};

// A home page (layout: home): full-width hero, no
// sidebar.
const homeDoc: MarkdownDoc = {
  frontmatter: frontmatter(some("home")),
  firstHeading: none(),
  body: content,
  links: [],
  slugs: [],
};

// The page layout composed exactly the way the build
// pipeline wires it: page() → shell().
const rendered = renderToString(
  shell(
    config,
    contentDoc,
    page(
      config,
      contentDoc,
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
    page(
      config,
      homeDoc,
      content,
      activePath,
      config.base,
    ),
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

test("includes a CSS-only <details> sidebar with an active-marked link", () =>
  all([
    check(
      rendered,
      toContain(
        'aria-label="Sidebar navigation"',
      ),
    ),
    check(rendered, toContain("<details")),
    check(rendered, toContain("<summary")),
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

test("home page renders the hero content with NO sidebar", () =>
  all([
    check(renderedHome, toContain("<nav")),
    check(
      renderedHome,
      toContain("Article content here"),
    ),
    check(
      renderedHome,
      not(
        toContain(
          'aria-label="Sidebar navigation"',
        ),
      ),
    ),
    check(
      renderedHome,
      not(toContain("<details")),
    ),
  ]));
