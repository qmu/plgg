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
  htmlSpan,
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

test("with rawHtml OFF (default) angle brackets stay literal Text", () =>
  check(
    renderInline("a <small>b</small> c"),
    toEqual([inlineText("a <small>b</small> c")]),
  ));

test("with rawHtml ON, tag tokens become HtmlSpans and inner text stays Text", () =>
  check(
    renderInline("a <small>b</small> c", true),
    toEqual([
      inlineText("a "),
      htmlSpan("<small>"),
      inlineText("b"),
      htmlSpan("</small>"),
      inlineText(" c"),
    ]),
  ));

test("with rawHtml ON, a `<` that opens no tag stays literal Text", () =>
  check(
    renderInline("x < y & z", true),
    toEqual([inlineText("x < y & z")]),
  ));

test("plainText drops a raw inline HTML span (no slug text)", () =>
  check(
    plainText(renderInline("A <b>B</b> C", true)),
    toBe("A B C"),
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

test("a bare URL in prose becomes a link", () =>
  check(
    renderInline("see http://example.com/x now"),
    toEqual([
      inlineText("see "),
      link("http://example.com/x", [
        inlineText("http://example.com/x"),
      ]),
      inlineText(" now"),
    ]),
  ));

test("a www host links through an implied http://, and the sentence keeps its period", () =>
  check(
    renderInline("at www.example.com."),
    toEqual([
      inlineText("at "),
      link("http://www.example.com", [
        inlineText("www.example.com"),
      ]),
      inlineText("."),
    ]),
  ));

test("a bare address links through an implied mailto:", () =>
  check(
    renderInline("mail ada@example.com ok"),
    toEqual([
      inlineText("mail "),
      link("mailto:ada@example.com", [
        inlineText("ada@example.com"),
      ]),
      inlineText(" ok"),
    ]),
  ));

// Autolinks are switched off inside link text: an `<a>`
// nested in an `<a>` is not representable HTML.
test("an autolink is not recognized inside link text", () =>
  check(
    renderInline("[http://example.com/x](/y)"),
    toEqual([
      link("/y", [
        inlineText("http://example.com/x"),
      ]),
    ]),
  ));

test("an autolink IS recognized inside emphasis", () =>
  check(
    renderInline("*www.example.com*"),
    toEqual([
      emph([
        link("http://www.example.com", [
          inlineText("www.example.com"),
        ]),
      ]),
    ]),
  ));

test("a URL inside a code span is left verbatim", () =>
  check(
    renderInline("use `http://example.com` here"),
    toEqual([
      inlineText("use "),
      inlineCode("http://example.com"),
      inlineText(" here"),
    ]),
  ));

// The angle-bracketed `<scheme:…>` autolink is a DIFFERENT
// GFM form, queued separately; this pins that the extended
// forms added here do not half-match it.
test("an angle-bracketed autolink is still literal text", () =>
  check(
    renderInline("<https://example.com/x>"),
    toEqual([
      inlineText("<https://example.com/x>"),
    ]),
  ));

test("with rawHtml ON a URL in an attribute stays part of the tag", () =>
  check(
    renderInline(
      'a <a href="http://example.com">b</a> c',
      true,
    ),
    toEqual([
      inlineText("a "),
      htmlSpan('<a href="http://example.com">'),
      inlineText("b"),
      htmlSpan("</a>"),
      inlineText(" c"),
    ]),
  ));

// With rawHtml OFF the tag is literal text that the
// renderer escapes — autolinking must not carve a live
// link out of the middle of it.
test("with rawHtml OFF a URL in an attribute is not autolinked either", () =>
  check(
    renderInline(
      'a <a href="http://example.com">b</a> c',
    ),
    toEqual([
      inlineText(
        'a <a href="http://example.com">b</a> c',
      ),
    ]),
  ));

test("plainText is unchanged by autolinking, so heading slugs do not move", () =>
  check(
    plainText(
      renderInline("see http://example.com/x now"),
    ),
    toBe("see http://example.com/x now"),
  ));
