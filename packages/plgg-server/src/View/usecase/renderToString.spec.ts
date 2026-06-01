import { test, expect } from "vitest";
import { el, p, text, attr } from "plgg-view";
import { renderToString } from "plgg-server/index";

// plgg-server re-exports plgg-view's pure SSR fold; these confirm the package
// surface escapes and self-closes correctly (the exhaustive cases live in
// plgg-view's own spec).

test("renders an element with escaped attributes and children", () => {
  expect(
    renderToString(
      // The outer element is the escape hatch `el` too: an `el(...)` node is
      // string-branded, so it does not fit a typed builder's child slot (e.g.
      // `a`/`div`). Untyped (`el`) subtrees stay contiguous — typed islands and
      // escape-hatch islands do not interleave.
      el(
        "a",
        [
          attr("href", "/x"),
          attr("title", '"&<'),
        ],
        [
          text("go & "),
          el("b", [], [text("bold")]),
        ],
      ),
    ),
  ).toBe(
    '<a href="/x" title="&quot;&amp;&lt;">go &amp; <b>bold</b></a>',
  );
});

test("void elements self-close and text is escaped (XSS-safe)", () => {
  expect(
    renderToString(
      el("img", [attr("src", "/a.png")], []),
    ),
  ).toBe('<img src="/a.png" />');
  expect(
    renderToString(p([], [text("<x> & </x>")])),
  ).toBe("<p>&lt;x&gt; &amp; &lt;/x&gt;</p>");
});

test("unsafe attribute names are dropped, safe ones kept", () => {
  expect(
    renderToString(
      el(
        "div",
        [
          attr("data-ok", "1"),
          attr("bad name", "2"),
        ],
        [],
      ),
    ),
  ).toBe('<div data-ok="1"></div>');
});
