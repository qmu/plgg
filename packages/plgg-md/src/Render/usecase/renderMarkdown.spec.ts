import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
  someThen,
} from "plgg-test";
import { none } from "plgg";
import {
  renderToString,
  el,
  text,
  class_,
} from "plgg-view";
import {
  renderMarkdown,
  renderMarkdownWith,
} from "plgg-md/Render/usecase/renderMarkdown";

/** Em-dash (U+2014) — RETAINED in slugs per the spike. */
const EM = "—";

const src = (
  ...lines: ReadonlyArray<string>
): string => lines.join("\n");

// A representative corpus page: an h1, the
// backtick/generics/em-dash/duplicate headings whose exact
// VitePress slugs `plgg-md` must reproduce, links (internal
// / external / bare-anchor), a raw <tag>, a ::: container,
// a pipe table, and a ```ts fence.
const page = src(
  "# Getting started",
  "",
  "Prose with an [internal](/concepts/option), an [external](https://github.com/qmu/plgg), and an [anchor](#prefer-str-for-strings).",
  "",
  "## Prefer `Str` for strings",
  "",
  `## The view tree ${EM} \`Html<Msg, T>\``,
  "",
  `## SSR ${EM} \`renderToString\``,
  "",
  "## Defect",
  "",
  "## Defect",
  "",
  "Raw <tag> stays text.",
  "",
  "::: tip Heads up",
  "Callout body.",
  ":::",
  "",
  "| A | B |",
  "| :-- | --: |",
  "| 1 | 2 |",
  "",
  "```ts",
  "const x: number = 1;",
  "```",
);

test("renders a corpus page to XSS-safe HTML with EXACT slug ids", () =>
  check(
    renderMarkdown(page),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all([
        // firstHeading = the first H1's plain text.
        check(
          doc.firstHeading,
          someThen(toBe("Getting started")),
        ),
        // EXACT slug parity (cite `spike-decisions.md` §3):
        // backtick text, em-dash + generics, em-dash, dedup.
        check(
          doc.slugs,
          toEqual([
            "getting-started",
            "prefer-str-for-strings",
            `the-view-tree-${EM}-html-msg-t`,
            `ssr-${EM}-rendertostring`,
            "defect",
            "defect-1",
          ]),
        ),
        // the same ids are carried in the rendered body.
        check(
          html,
          toContain('<h1 id="getting-started">'),
        ),
        check(
          html,
          toContain(
            'id="prefer-str-for-strings"',
          ),
        ),
        check(
          html,
          toContain(
            `id="the-view-tree-${EM}-html-msg-t"`,
          ),
        ),
        check(
          html,
          toContain(
            `id="ssr-${EM}-rendertostring"`,
          ),
        ),
        check(html, toContain('id="defect"')),
        check(html, toContain('id="defect-1"')),
        // backtick heading text became a <code> span.
        check(
          html,
          toContain(
            "<code>Html&lt;Msg, T&gt;</code>",
          ),
        ),
        // a raw <tag> survives only as escaped text.
        check(html, toContain("&lt;tag&gt;")),
        // callout -> div with kind class + title.
        check(
          html,
          toContain(
            'class="callout callout-tip"',
          ),
        ),
        check(html, toContain("Heads up")),
        check(html, toContain("Callout body.")),
        // pipe table with honored alignment.
        check(html, toContain("<table>")),
        check(html, toContain("text-align:left")),
        check(
          html,
          toContain("text-align:right"),
        ),
        // default plain fence -> escaped pre>code.
        check(
          html,
          toContain('<code class="language-ts">'),
        ),
        check(
          html,
          toContain("const x: number = 1;"),
        ),
        // identity resolver leaves every link as authored.
        check(
          doc.links,
          toEqual([
            "/concepts/option",
            "https://github.com/qmu/plgg",
            "#prefer-str-for-strings",
          ]),
        ),
      ]);
    }),
  ));

test("injected highlighter + link resolver are honored", () =>
  check(
    renderMarkdownWith(
      // a placeholder highlighter (no compiler import here).
      () =>
        el(
          "pre",
          [class_("hl")],
          [text("HIGHLIGHTED")],
        ),
      // a base-aware resolver: prefix internal `/…` only.
      (href) =>
        href.startsWith("/")
          ? `/base${href}`
          : href,
    )(page),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all([
        // fence routed through the injected highlighter.
        check(html, toContain('class="hl"')),
        check(html, toContain("HIGHLIGHTED")),
        // internal href rewritten…
        check(
          html,
          toContain(
            'href="/base/concepts/option"',
          ),
        ),
        // …external and bare-anchor links untouched.
        check(
          html,
          toContain(
            'href="https://github.com/qmu/plgg"',
          ),
        ),
        check(
          html,
          toContain(
            'href="#prefer-str-for-strings"',
          ),
        ),
        // the links surface reflects the resolver too.
        check(
          doc.links,
          toContain("/base/concepts/option"),
        ),
      ]);
    }),
  ));

test("layout-home frontmatter is detected and stripped", () =>
  check(
    renderMarkdownWith(
      () => el("pre", [], [text("")]),
      (href) => href,
    )(
      src(
        "---",
        "layout: home",
        "---",
        "# Home",
        "",
        "Body.",
      ),
    ),
    okThen((doc) =>
      all([
        check(
          doc.frontmatter.layout,
          someThen(toBe("home")),
        ),
        check(
          doc.firstHeading,
          someThen(toBe("Home")),
        ),
      ]),
    ),
  ));

test("a page with no H1 has firstHeading None", () =>
  check(
    renderMarkdown(
      src("## Subsection", "", "Just prose."),
    ),
    okThen((doc) =>
      check(doc.firstHeading, toEqual(none())),
    ),
  ));

test("ordered/nested lists render as ol/ul + li", () =>
  check(
    renderMarkdown(
      src(
        "1. first",
        "2. second",
        "   - nested a",
        "   - nested b",
      ),
    ),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all([
        check(html, toContain("<ol>")),
        check(html, toContain("<ul>")),
        check(html, toContain("nested a")),
      ]);
    }),
  ));

// One page exercising every remaining block/inline arm:
// list + nesting, a single-column table, a blockquote with
// a link, a title-less ::: container, a thematic break, an
// unlabeled fence, plus an image / soft-and-hard breaks in
// a paragraph. No H1 -> firstHeading is None.
const sink = src(
  "## Section",
  "",
  "Has [a](/x) and ![pic](/p.png) and `c` and **b** and *i* and a break  ",
  "second line.",
  "",
  "- one",
  "- two",
  "  - nested",
  "",
  "| H |",
  "| - |",
  "| v |",
  "",
  "> quoted [q](/q)",
  "",
  "::: warning",
  "warn body",
  ":::",
  "",
  "***",
  "",
  "```",
  "plain code",
  "```",
);

test("folds every block/inline construct (no H1 -> None title)", () =>
  check(
    renderMarkdown(sink),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all([
        check(doc.firstHeading, toEqual(none())),
        check(html, toContain("<ul>")),
        check(html, toContain("nested")),
        check(html, toContain("<table>")),
        check(html, toContain("<blockquote>")),
        // a title-less container defaults to the capitalized kind.
        check(
          html,
          toContain(
            'class="callout callout-warning"',
          ),
        ),
        check(html, toContain("Warning")),
        check(html, toContain("<hr />")),
        check(html, toContain("<br />")),
        check(html, toContain("<img")),
        // an unlabeled fence -> a class-less pre>code.
        check(
          html,
          toContain(
            "<pre><code>plain code</code></pre>",
          ),
        ),
        // links from the paragraph and the blockquote are collected.
        check(doc.links, toContain("/x")),
        check(doc.links, toContain("/q")),
        check(doc.links, toContain("/p.png")),
      ]);
    }),
  ));

test("firstHeading recurses into a container before the body", () =>
  check(
    renderMarkdown(
      src("::: tip T", "# Inner", ":::", "tail"),
    ),
    okThen((doc) =>
      check(
        doc.firstHeading,
        someThen(toBe("Inner")),
      ),
    ),
  ));

test("firstHeading recurses into a blockquote", () =>
  check(
    renderMarkdown(
      src("> # Quoted H1", "> body"),
    ),
    okThen((doc) =>
      check(
        doc.firstHeading,
        someThen(toBe("Quoted H1")),
      ),
    ),
  ));

test("an unterminated fence surfaces as an InvalidError", () =>
  check(
    renderMarkdown(src("```ts", "no close")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated code fence"),
      ),
    ),
  ));

test("unterminated frontmatter fails before block parsing", () =>
  check(
    renderMarkdown(src("---", "layout: home")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated frontmatter"),
      ),
    ),
  ));
