import {
  test,
  check,
  toEqual,
  okThen,
  errThen,
  toContain,
} from "plgg-test";
import { some, none } from "plgg";
import {
  heading,
  para,
  codeFence,
  list,
  quote,
  table,
  callout,
  thematicBreak,
  htmlBlock,
} from "plgg-md/Block/model/Block";
import { parseBlocks } from "plgg-md/Block/usecase/parseBlocks";

const src = (
  ...lines: ReadonlyArray<string>
): string => lines.join("\n");

test("with rawHtml OFF (default) a block-level HTML line is a paragraph", () =>
  check(
    parseBlocks(
      src("# T", "", '<div class="x">hi</div>'),
    ),
    okThen(
      toEqual([
        heading(1, "T"),
        para('<div class="x">hi</div>'),
      ]),
    ),
  ));

test("with rawHtml ON a block-level HTML run becomes one HtmlBlock", () =>
  check(
    parseBlocks(
      src(
        "# T",
        "",
        "<div>",
        '  <img src="a.png" />',
        "</div>",
        "",
        "After.",
      ),
      true,
    ),
    okThen(
      toEqual([
        heading(1, "T"),
        htmlBlock(
          '<div>\n  <img src="a.png" />\n</div>',
        ),
        para("After."),
      ]),
    ),
  ));

test("with rawHtml ON a single-line HTML marker is its own HtmlBlock", () =>
  check(
    parseBlocks(
      src(
        '<small class="updated">t</small>',
        "",
        "Prose.",
      ),
      true,
    ),
    okThen(
      toEqual([
        htmlBlock(
          '<small class="updated">t</small>',
        ),
        para("Prose."),
      ]),
    ),
  ));

test("headings and a paragraph", () =>
  check(
    parseBlocks(
      src(
        "# H1",
        "## H2",
        "",
        "Some paragraph text.",
      ),
    ),
    okThen(
      toEqual([
        heading(1, "H1"),
        heading(2, "H2"),
        para("Some paragraph text."),
      ]),
    ),
  ));

test("a labeled ```ts fence captures the language verbatim", () =>
  check(
    parseBlocks(
      src(
        "```typescript",
        'import { div } from "plgg-view";',
        "```",
      ),
    ),
    okThen(
      toEqual([
        codeFence(
          some("typescript"),
          'import { div } from "plgg-view";',
        ),
      ]),
    ),
  ));

test("an unlabeled fence has a None language", () =>
  check(
    parseBlocks(src("```", "plain text", "```")),
    okThen(
      toEqual([codeFence(none(), "plain text")]),
    ),
  ));

test("a tilde line does not close a backtick fence", () =>
  check(
    parseBlocks(
      src("```ts", "~~~", "still code", "```"),
    ),
    okThen(
      toEqual([
        codeFence(some("ts"), "~~~\nstill code"),
      ]),
    ),
  ));

test("an unterminated fence is an error", () =>
  check(
    parseBlocks(src("```ts", "no close here")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated code fence"),
      ),
    ),
  ));

// A :::: container wrapping a nested ::: tip — the inner
// body is the real `::: tip Regenerating locally` from
// packages/guide/api/index.md.
test("a :::: container nests a ::: tip (matching colon counts)", () =>
  check(
    parseBlocks(
      src(
        ":::: tip Outer note",
        "Before the inner block.",
        "",
        "::: tip Regenerating locally",
        "Run `npm run docs:api` in `packages/guide`.",
        ":::",
        "::::",
      ),
    ),
    okThen(
      toEqual([
        callout("tip", some("Outer note"), [
          para("Before the inner block."),
          callout(
            "tip",
            some("Regenerating locally"),
            [
              para(
                "Run `npm run docs:api` in `packages/guide`.",
              ),
            ],
          ),
        ]),
      ]),
    ),
  ));

test("a container with no title has a None title", () =>
  check(
    parseBlocks(
      src("::: warning", "Heads up.", ":::"),
    ),
    okThen(
      toEqual([
        callout("warning", none(), [
          para("Heads up."),
        ]),
      ]),
    ),
  ));

test("a colon-count mismatch is an error", () =>
  check(
    parseBlocks(
      src(":::: tip Outer", "body", ":::"),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Mismatched container fence"),
      ),
    ),
  ));

test("an unterminated container is an error", () =>
  check(
    parseBlocks(
      src("::: tip Note", "body, no close"),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated container"),
      ),
    ),
  ));

test("an error inside a container body propagates", () =>
  check(
    parseBlocks(
      src(
        "::: tip Note",
        "```ts",
        "unterminated inner fence",
        ":::",
      ),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated code fence"),
      ),
    ),
  ));

// The real "What it is (and isn't)" table head from
// packages/guide/packages/plgg-view.md.
test("a pipe table parses header, alignment, and rows", () =>
  check(
    parseBlocks(
      src(
        "| ✅ | ❌ |",
        "|----|----|",
        "| `Model` / `Msg` | no `Cmd` |",
      ),
    ),
    okThen(
      toEqual([
        table(
          ["✅", "❌"],
          ["default", "default"],
          [["`Model` / `Msg`", "no `Cmd`"]],
        ),
      ]),
    ),
  ));

test("table alignment colons are honored", () =>
  check(
    parseBlocks(
      src(
        "| a | b | c | d |",
        "|:--|:-:|--:|---|",
        "| 1 | 2 | 3 | 4 |",
      ),
    ),
    okThen(
      toEqual([
        table(
          ["a", "b", "c", "d"],
          ["left", "center", "right", "default"],
          [["1", "2", "3", "4"]],
        ),
      ]),
    ),
  ));

test("a separator/header column mismatch is a malformed table", () =>
  check(
    parseBlocks(
      src("| a | b |", "|---|---|---|"),
    ),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Malformed table"),
      ),
    ),
  ));

test("a blockquote parses its de-quoted body", () =>
  check(
    parseBlocks(src("> quoted line", "> second")),
    okThen(
      toEqual([
        quote([para("quoted line\nsecond")]),
      ]),
    ),
  ));

test("an error inside a blockquote body propagates", () =>
  check(
    parseBlocks(src("> ```ts", "> unterminated")),
    errThen((e) =>
      check(
        e.content.message,
        toContain("Unterminated code fence"),
      ),
    ),
  ));

test("a thematic break separates paragraphs", () =>
  check(
    parseBlocks(
      src("before", "", "---", "", "after"),
    ),
    okThen(
      toEqual([
        para("before"),
        thematicBreak(),
        para("after"),
      ]),
    ),
  ));

test("a nested unordered list keeps children under their parent", () =>
  check(
    parseBlocks(
      src(
        "- parent one",
        "  - child a",
        "  - child b",
        "- parent two",
      ),
    ),
    okThen(
      toEqual([
        list(false, [
          {
            text: "parent one",
            children: [
              list(false, [
                { text: "child a", children: [] },
                { text: "child b", children: [] },
              ]),
            ],
          },
          { text: "parent two", children: [] },
        ]),
      ]),
    ),
  ));

test("an ordered list is flagged ordered", () =>
  check(
    parseBlocks(src("1. first", "2. second")),
    okThen(
      toEqual([
        list(true, [
          { text: "first", children: [] },
          { text: "second", children: [] },
        ]),
      ]),
    ),
  ));

test("an indented continuation line wraps the item text", () =>
  check(
    parseBlocks(
      src(
        "- item text",
        "  wrapped continuation",
        "- second",
      ),
    ),
    okThen(
      toEqual([
        list(false, [
          {
            text: "item text wrapped continuation",
            children: [],
          },
          { text: "second", children: [] },
        ]),
      ]),
    ),
  ));

test("a raw HTML line falls back to paragraph text", () =>
  check(
    parseBlocks(
      src('<custom-el data-x="1">hi</custom-el>'),
    ),
    okThen(
      toEqual([
        para(
          '<custom-el data-x="1">hi</custom-el>',
        ),
      ]),
    ),
  ));

// Tight adjacency (no blank line) — exercises the
// paragraph terminator for each block kind.
test("a paragraph ends at an adjacent heading", () =>
  check(
    parseBlocks(src("alpha", "# Heading")),
    okThen(
      toEqual([
        para("alpha"),
        heading(1, "Heading"),
      ]),
    ),
  ));

test("a paragraph ends at an adjacent fence", () =>
  check(
    parseBlocks(
      src("zeta", "```ts", "code", "```"),
    ),
    okThen(
      toEqual([
        para("zeta"),
        codeFence(some("ts"), "code"),
      ]),
    ),
  ));

test("a paragraph ends at an adjacent container", () =>
  check(
    parseBlocks(
      src(
        "epsilon",
        "::: tip Note",
        "body",
        ":::",
      ),
    ),
    okThen(
      toEqual([
        para("epsilon"),
        callout("tip", some("Note"), [
          para("body"),
        ]),
      ]),
    ),
  ));

test("a paragraph ends at an adjacent thematic break", () =>
  check(
    parseBlocks(src("eta", "***")),
    okThen(
      toEqual([para("eta"), thematicBreak()]),
    ),
  ));

test("a paragraph ends at an adjacent blockquote", () =>
  check(
    parseBlocks(src("delta", "> q")),
    okThen(
      toEqual([
        para("delta"),
        quote([para("q")]),
      ]),
    ),
  ));

test("a paragraph ends at an adjacent list", () =>
  check(
    parseBlocks(src("gamma", "- li")),
    okThen(
      toEqual([
        para("gamma"),
        list(false, [
          { text: "li", children: [] },
        ]),
      ]),
    ),
  ));

test("a paragraph ends at an adjacent table", () =>
  check(
    parseBlocks(
      src(
        "beta",
        "| h1 | h2 |",
        "|----|----|",
        "| a | b |",
      ),
    ),
    okThen(
      toEqual([
        para("beta"),
        table(
          ["h1", "h2"],
          ["default", "default"],
          [["a", "b"]],
        ),
      ]),
    ),
  ));
