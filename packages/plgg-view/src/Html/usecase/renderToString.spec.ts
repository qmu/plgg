import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import {
  el,
  text,
  div,
  input,
} from "plgg-view/Html/model/element";
import {
  class_,
  attr,
  onClick,
  fadeIn,
} from "plgg-view/Html/model/Attribute";
import { renderToString } from "plgg-view/Html/usecase/renderToString";
import {
  style_,
  hashClass,
} from "plgg-view/Style/usecase/style_";
import { p } from "plgg-view/Style/usecase/utilities";

test("renders an element with escaped attributes and children", () =>
  check(
    renderToString(
      div(
        [class_("todo")],
        [text("Buy <milk> & eggs")],
      ),
    ),
    toBe(
      '<div class="todo">Buy &lt;milk&gt; &amp; eggs</div>',
    ),
  ));

test("neutralizes a javascript: URL on a URL-bearing attribute", () => {
  const out = renderToString(
    el(
      "a",
      [attr("href", "javascript:alert(1)")],
      [text("x")],
    ),
  );
  return all([
    check(out, toContain('href="#"')),
    check(out, not(toContain("javascript:"))),
  ]);
});

test("preserves legitimate http/mailto/relative URLs", () =>
  all([
    check(
      renderToString(
        el(
          "a",
          [
            attr(
              "href",
              "https://example.com/p?q=1",
            ),
          ],
          [],
        ),
      ),
      toContain(
        'href="https://example.com/p?q=1"',
      ),
    ),
    check(
      renderToString(
        el(
          "a",
          [attr("href", "mailto:a@b.co")],
          [],
        ),
      ),
      toContain('href="mailto:a@b.co"'),
    ),
    check(
      renderToString(
        el("a", [attr("href", "/local/path")], []),
      ),
      toContain('href="/local/path"'),
    ),
  ]));

test("drops an on* event-handler attribute name", () =>
  check(
    renderToString(
      el("img", [attr("onerror", "alert(1)")], []),
    ),
    not(toContain("onerror")),
  ));

test("drops an unsafe tag emitted via the el() hatch", () =>
  check(
    renderToString(
      el("div onload=alert(1)", [], [text("x")]),
    ),
    toBe(""),
  ));

test("drops event handlers (no events on the server)", () =>
  check(
    renderToString(
      el(
        "button",
        [onClick<string>("clicked"), class_("b")],
        [text("Go")],
      ),
    ),
    toBe('<button class="b">Go</button>'),
  ));

test("drops animation directives (no animation on the server)", () =>
  check(
    renderToString(
      el(
        "div",
        [fadeIn(150), class_("box")],
        [text("Hi")],
      ),
    ),
    toBe('<div class="box">Hi</div>'),
  ));

test("emits style_() atomic classes as a class attribute", () =>
  check(
    renderToString(
      el(
        "div",
        [style_("todo", p(2))],
        [text("hi")],
      ),
    ),
    toBe(
      `<div class="todo ${hashClass("|padding:0.5rem")}">hi</div>`,
    ),
  ));

test("a style_() with no classes emits no class attribute", () =>
  check(
    renderToString(
      el("div", [style_()], [text("x")]),
    ),
    toBe("<div>x</div>"),
  ));

test("self-closes void elements", () =>
  check(
    renderToString(
      input([attr("type", "text")], []),
    ),
    toBe('<input type="text" />'),
  ));

test("drops attributes with unsafe names", () =>
  check(
    renderToString(
      el("div", [attr("on click", "x")], []),
    ),
    toBe("<div></div>"),
  ));

test("escapes attribute values that try to break out", () =>
  check(
    renderToString(
      el("a", [attr("title", '"><script>')], []),
    ),
    toBe(
      '<a title="&quot;&gt;&lt;script&gt;"></a>',
    ),
  ));
