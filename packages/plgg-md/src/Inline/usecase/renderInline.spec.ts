import {
  test,
  check,
  all,
  toEqual,
  toBe,
} from "plgg-test";
import {
  inlineText,
  inlineCode,
  emph,
  strong,
  link,
  image,
  lineBreak,
} from "plgg-md/Inline/model/Inline";
import {
  renderInline,
  plainText,
} from "plgg-md/Inline/usecase/renderInline";

test("plain text becomes a single Text node", () =>
  check(
    renderInline("just words"),
    toEqual([inlineText("just words")]),
  ));

test("inline code is captured verbatim, not re-parsed", () =>
  check(
    renderInline("a `Option<T>` b"),
    toEqual([
      inlineText("a "),
      inlineCode("Option<T>"),
      inlineText(" b"),
    ]),
  ));

test("strong precedes emphasis; both recurse", () =>
  all([
    check(
      renderInline("**bold**"),
      toEqual([strong([inlineText("bold")])]),
    ),
    check(
      renderInline("*italic*"),
      toEqual([emph([inlineText("italic")])]),
    ),
  ]));

test("links keep their href and recurse into link text", () =>
  check(
    renderInline("see [the `Str`](/x#y) here"),
    toEqual([
      inlineText("see "),
      link("/x#y", [
        inlineText("the "),
        inlineCode("Str"),
      ]),
      inlineText(" here"),
    ]),
  ));

test("images carry src and alt", () =>
  check(
    renderInline("![a logo](/logo.png)"),
    toEqual([image("/logo.png", "a logo")]),
  ));

test("a raw <tag> stays literal text (no raw-HTML node)", () =>
  check(
    renderInline("uses <div> and <Foo>"),
    toEqual([inlineText("uses <div> and <Foo>")]),
  ));

test("two trailing spaces before a newline is a hard break", () =>
  check(
    renderInline("a  \nb"),
    toEqual([
      inlineText("a"),
      lineBreak(),
      inlineText("b"),
    ]),
  ));

test("an unmatched marker is treated literally", () =>
  check(
    renderInline("2 * 3 = 6"),
    toEqual([inlineText("2 * 3 = 6")]),
  ));

test("a backslash before a newline is a hard break", () =>
  check(
    renderInline("a\\\nb"),
    toEqual([
      inlineText("a"),
      lineBreak(),
      inlineText("b"),
    ]),
  ));

test("a single newline without markers is a soft break (space)", () =>
  check(
    renderInline("a\nb"),
    toEqual([inlineText("a b")]),
  ));

test("an unterminated code run is literal text", () =>
  check(
    renderInline("a `b c"),
    toEqual([inlineText("a `b c")]),
  ));

test("an unterminated strong run is literal text", () =>
  check(
    renderInline("**x"),
    toEqual([inlineText("**x")]),
  ));

test("inline code trims a single surrounding space", () =>
  check(
    renderInline("` x `"),
    toEqual([inlineCode("x")]),
  ));

test("plainText resolves inline markup away for slugging", () =>
  check(
    plainText(
      renderInline(
        "a `b` **c** [d](/e) ![f](/g)",
      ),
    ),
    toBe("a b c d f"),
  ));

test("plainText turns a line break into a space", () =>
  check(
    plainText(renderInline("a  \nb")),
    toBe("a b"),
  ));
