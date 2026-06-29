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
import { navBar } from "plgg-press/theme/navBar";
import { sidebarTree } from "plgg-press/theme/sidebarTree";

// The whole content chrome of one page, composed the way
// the build pipeline will: nav + sidebar + rendered body,
// handed to the document shell.
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

const body: Html<never> = div(
  [],
  [
    navBar(config, activePath),
    sidebarTree(
      config.sidebar,
      activePath,
      config.base,
    ),
    content,
  ],
);

const doc: MarkdownDoc = {
  frontmatter: frontmatter(none()),
  firstHeading: some("Getting Started"),
  body,
  links: [],
  slugs: [],
};

const rendered = renderToString(
  shell(config, doc, body),
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
