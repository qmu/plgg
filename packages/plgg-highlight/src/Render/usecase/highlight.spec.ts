import {
  test,
  check,
  all,
  not,
  toContain,
  toEqual,
} from "plgg-test";
import { some, none, SoftStr } from "plgg";
import { renderToString } from "plgg-view";
import { color } from "plgg-view/style";
import { type Highlighter } from "plgg-md";
import {
  asHighlighter,
  highlightCss,
} from "plgg-highlight/Render/usecase/highlight";
import {
  keyword,
  stringKind,
  numberKind,
  comment,
  identifier,
  punctuation,
  regex,
  template,
  plain,
} from "plgg-highlight/Token/model/Token";

/** The seam under test, applied and rendered to a string. */
const render = (
  lang: Parameters<Highlighter>[0],
  src: SoftStr,
): SoftStr =>
  renderToString(asHighlighter()(lang, src));

test("the ts alias takes the scanner path: pre>code with styled spans", () =>
  all([
    check(
      render(some("typescript"), "const x = 1"),
      toContain("<pre>"),
    ),
    check(
      render(some("typescript"), "const x = 1"),
      toContain("<code>"),
    ),
    check(
      render(some("typescript"), "const x = 1"),
      toContain("<span"),
    ),
    // `primary` (#1f6b54) is the keyword color; its
    // presence on a span proves classification + styling.
    check(
      render(some("typescript"), "const x = 1"),
      toContain("color:#1f6b54"),
    ),
  ]));

test("the javascript alias also takes the scanner path", () =>
  check(
    render(some("javascript"), "let y = 2"),
    toContain("<span"),
  ));

test("a bash fence takes the plain fallback: no spans, no token colors", () =>
  all([
    check(
      render(some("bash"), "echo hi"),
      toContain("<pre>"),
    ),
    check(
      render(some("bash"), "echo hi"),
      not(toContain("<span")),
    ),
    check(
      render(some("bash"), "echo hi"),
      not(toContain("color:")),
    ),
  ]));

test("an unlabeled fence (None) takes the plain fallback", () =>
  all([
    check(
      render(none(), "anything goes"),
      not(toContain("<span")),
    ),
    check(
      render(none(), "anything goes"),
      toContain("<pre>"),
    ),
  ]));

test("the plain fallback HTML-escapes its body", () =>
  all([
    check(
      render(none(), "a < b & c"),
      toContain("&lt;"),
    ),
    check(
      render(none(), "a < b & c"),
      toContain("&amp;"),
    ),
  ]));

test("highlightCss maps every TokenKind to a plgg-view color token", () =>
  all([
    check(
      highlightCss(keyword()),
      toEqual(color("primary")),
    ),
    check(
      highlightCss(stringKind()),
      toEqual(color("danger")),
    ),
    check(
      highlightCss(numberKind()),
      toEqual(color("danger")),
    ),
    check(
      highlightCss(comment()),
      toEqual(color("muted")),
    ),
    check(
      highlightCss(identifier()),
      toEqual(color("text")),
    ),
    check(
      highlightCss(punctuation()),
      toEqual(color("muted")),
    ),
    check(
      highlightCss(regex()),
      toEqual(color("danger")),
    ),
    check(
      highlightCss(template()),
      toEqual(color("danger")),
    ),
    check(
      highlightCss(plain()),
      toEqual(color("text")),
    ),
  ]));

test("asHighlighter() satisfies plgg-md's Highlighter seam", () => {
  // Compile-time proof: the seam-typed parameter only
  // accepts a value assignable to plgg-md's `Highlighter`.
  const useSeam = (h: Highlighter): SoftStr =>
    renderToString(h(none(), "ok"));
  return check(
    useSeam(asHighlighter()),
    toContain("<pre>"),
  );
});
