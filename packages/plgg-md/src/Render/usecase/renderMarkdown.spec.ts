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
  attr,
} from "plgg-view";
import {
  renderMarkdown,
  renderMarkdownWith,
  renderMarkdownWithOptions,
} from "plgg-md/Render/usecase/renderMarkdown";
import {
  type RenderOptions,
  type HeadingDecorator,
  plainHighlighter,
  identityResolver,
  defaultHeading,
} from "plgg-md/Render/model/seam";
import {
  slugify,
  githubSlugify,
} from "plgg-md/Render/usecase/slugify";

/** Options at defaults, with `rawHtml` toggled per test. */
const opts = (
  rawHtml: boolean,
): RenderOptions => ({
  highlighter: plainHighlighter,
  resolveLink: identityResolver,
  rawHtml,
  slug: slugify,
  decorateHeading: defaultHeading,
});

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

test("headings carries depth + text + the exact body slugs, in document order", () =>
  check(
    renderMarkdown(
      src(
        "# Title",
        "",
        "## First section",
        "",
        "### Sub point",
        "",
        "## First section",
        "",
        "::: tip",
        "#### Inside a callout",
        ":::",
      ),
    ),
    okThen((doc) =>
      all([
        toEqual([
          {
            level: 1,
            text: "Title",
            slug: "title",
            ordinal: [1],
          },
          {
            level: 2,
            text: "First section",
            slug: "first-section",
            ordinal: [1, 1],
          },
          {
            level: 3,
            text: "Sub point",
            slug: "sub-point",
            ordinal: [1, 1, 1],
          },
          {
            level: 2,
            text: "First section",
            slug: "first-section-1",
            // the H3 above is dropped, not carried
            ordinal: [1, 2],
          },
          {
            level: 4,
            text: "Inside a callout",
            slug: "inside-a-callout",
            // no H3 above it — the missing ancestor is a
            // `0`, not an invented `1`
            ordinal: [1, 2, 0, 1],
          },
        ])(doc.headings),
        // slugs derives from headings — lock-step by
        // construction
        toEqual(doc.headings.map((h) => h.slug))(
          doc.slugs,
        ),
        // the body carries the very same ids
        check(
          renderToString(doc.body),
          toContain('id="first-section-1"'),
        ),
      ]),
    ),
  ));

// --- opt-in raw-HTML passthrough -----------------------

const HTML_BLOCK_PAGE = src(
  "# T",
  "",
  '<small class="updated">最終更新: 2026-07-09 & later</small>',
  "",
);

test("raw HTML block is emitted verbatim when rawHtml is ON", () =>
  check(
    renderMarkdownWithOptions(opts(true))(
      HTML_BLOCK_PAGE,
    ),
    okThen((doc) =>
      check(
        renderToString(doc.body),
        toContain(
          '<small class="updated">最終更新: 2026-07-09 & later</small>',
        ),
      ),
    ),
  ));

test("the SAME HTML block is escaped as text when rawHtml is OFF (default)", () =>
  check(
    renderMarkdown(HTML_BLOCK_PAGE),
    okThen((doc) =>
      all([
        // text-escaping touches &/</> (not quotes)
        check(
          renderToString(doc.body),
          toContain(
            '&lt;small class="updated"&gt;',
          ),
        ),
        // and never leaks a real tag
        check(
          renderToString(doc.body),
          toContain("&amp; later&lt;/small&gt;"),
        ),
      ]),
    ),
  ));

const INLINE_PAGE = src(
  "# T",
  "",
  "Before <small>x & y</small> after < b & c",
  "",
);

test("inline HTML span rides verbatim while surrounding text-level </>/& stay escaped (rawHtml ON)", () =>
  check(
    renderMarkdownWithOptions(opts(true))(
      INLINE_PAGE,
    ),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all([
        // the recognized tags are verbatim
        check(html, toContain("<small>")),
        check(html, toContain("</small>")),
        // the text BETWEEN the tags is still escaped
        check(html, toContain("x &amp; y")),
        // a `<` that opens no tag stays literal (escaped)
        check(html, toContain("&lt; b &amp; c")),
      ]);
    }),
  ));

test("inline HTML is fully escaped when rawHtml is OFF (default)", () =>
  check(
    renderMarkdown(INLINE_PAGE),
    okThen((doc) =>
      all([
        check(
          renderToString(doc.body),
          toContain(
            "&lt;small&gt;x &amp; y&lt;/small&gt;",
          ),
        ),
        check(
          renderToString(doc.body),
          toContain("&lt; b &amp; c"),
        ),
      ]),
    ),
  ));

// --- injectable heading slugger ------------------------

const SLUG_PAGE = src("# 型・関数の設計", "");

test("an injected github slugger changes the heading ids", () =>
  check(
    renderMarkdownWithOptions({
      highlighter: plainHighlighter,
      resolveLink: identityResolver,
      rawHtml: false,
      slug: githubSlugify,
      decorateHeading: defaultHeading,
    })(SLUG_PAGE),
    okThen((doc) =>
      all([
        check(
          doc.slugs,
          toEqual(["型関数の設計"]),
        ),
        check(
          renderToString(doc.body),
          toContain('id="型関数の設計"'),
        ),
      ]),
    ),
  ));

test("the default slugger (VitePress) is unchanged — it does NOT drop the middle dot", () =>
  check(
    renderMarkdown(SLUG_PAGE),
    okThen((doc) =>
      all([
        // whatever the default id is, it is NOT the github one
        check(
          doc.slugs.map(
            (s) => s === "型関数の設計",
          ),
          toEqual([false]),
        ),
        // and it equals the standalone default slugify
        check(
          doc.slugs,
          toEqual([slugify("型・関数の設計")]),
        ),
      ]),
    ),
  ));

// --- injectable heading element ------------------------

const NUMBERED = src(
  "# Alpha",
  "",
  "## Beta",
  "",
  "## Gamma",
  "",
  "### Delta",
  "",
  "# Epsilon",
);

/** Prints the ordinal ahead of the heading's own text. */
const numbering: HeadingDecorator = ({
  level,
  id,
  ordinal,
  children,
}) =>
  el(
    `h${level}`,
    [attr("id", id)],
    [text(`${ordinal.join("-")}. `), ...children],
  );

const numbered = (
  decorateHeading: HeadingDecorator,
): RenderOptions => ({
  highlighter: plainHighlighter,
  resolveLink: identityResolver,
  rawHtml: false,
  slug: slugify,
  decorateHeading,
});

test("an injected decorator owns the heading element", () =>
  check(
    renderMarkdownWithOptions(
      numbered(numbering),
    )(NUMBERED),
    okThen((doc) =>
      all([
        check(
          renderToString(doc.body),
          toContain(
            '<h1 id="alpha">1. Alpha</h1>',
          ),
        ),
        check(
          renderToString(doc.body),
          toContain(
            '<h3 id="delta">1-2-1. Delta</h3>',
          ),
        ),
        check(
          renderToString(doc.body),
          toContain(
            '<h1 id="epsilon">2. Epsilon</h1>',
          ),
        ),
      ]),
    ),
  ));

// The invariant the seam exists to protect: `headings` and
// `body` are built by two SEPARATE traversals, so a number
// the body shows must be the number the table of contents
// shows. It holds because `plgg-md` counts (a deterministic
// function of the heading sequence) rather than letting the
// decorator carry a counter that only the body would
// advance.
test("the ordinal in headings is the one the body renders", () =>
  check(
    renderMarkdownWithOptions(
      numbered(numbering),
    )(NUMBERED),
    okThen((doc) => {
      const html = renderToString(doc.body);
      return all(
        doc.headings.map((h) =>
          check(
            html,
            toContain(
              `<h${h.level} id="${h.slug}">${h.ordinal.join("-")}. ${h.text}</h${h.level}>`,
            ),
          ),
        ),
      );
    }),
  ));

test("a decorator cannot drift: rendering twice yields the same numbers", () =>
  check(
    renderMarkdownWithOptions(
      numbered(numbering),
    )(NUMBERED),
    okThen((first) =>
      check(
        renderMarkdownWithOptions(
          numbered(numbering),
        )(NUMBERED),
        okThen((second) =>
          all([
            check(
              renderToString(second.body),
              toBe(renderToString(first.body)),
            ),
            check(
              second.headings.map(
                (h) => h.ordinal,
              ),
              toEqual(
                first.headings.map(
                  (h) => h.ordinal,
                ),
              ),
            ),
          ]),
        ),
      ),
    ),
  ));

test("the default heading is unchanged — it ignores the ordinal", () =>
  check(
    renderMarkdown(NUMBERED),
    okThen((doc) =>
      all([
        check(
          renderToString(doc.body),
          toContain('<h1 id="alpha">Alpha</h1>'),
        ),
        // the ordinal is still computed and exposed, just
        // not printed by the default element
        check(
          doc.headings.map((h) => h.ordinal),
          toEqual([
            [1],
            [1, 1],
            [1, 2],
            [1, 2, 1],
            [2],
          ]),
        ),
      ]),
    ),
  ));
