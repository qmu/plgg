import {
  test,
  check,
  all,
  not,
  toContain,
} from "plgg-test";
import { some, none, SoftStr } from "plgg";
import { renderToString } from "plgg-view";
import { type Highlighter } from "plgg-md";
import { asHighlighter } from "plgg-highlight/Render/usecase/highlight";

/** The seam under test, applied and rendered to a string. */
const render = (
  lang: Parameters<Highlighter>[0],
  src: SoftStr,
): SoftStr =>
  renderToString(asHighlighter()(lang, src));

test("the ts alias takes the scanner path: pre>code with classed spans", () =>
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
    // `const` is a keyword -> a tok-keyword class span,
    // proving classification. Colours live in the theme
    // stylesheet (light/dark), NOT inline here.
    check(
      render(some("typescript"), "const x = 1"),
      toContain("tok-keyword"),
    ),
    // no inline colour is baked onto tokens anymore
    check(
      render(some("typescript"), "const x = 1"),
      not(toContain("style=")),
    ),
  ]));

test("the javascript alias also takes the scanner path", () =>
  check(
    render(some("javascript"), "let y = 2"),
    toContain("tok-keyword"),
  ));

test("a bash fence takes the plain fallback: no spans, no token classes", () =>
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
      not(toContain("tok-")),
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
