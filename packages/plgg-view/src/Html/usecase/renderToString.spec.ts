import { test, expect } from "vitest";
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

test("renders an element with escaped attributes and children", () => {
  const html = div(
    [class_("todo")],
    [text("Buy <milk> & eggs")],
  );
  expect(renderToString(html)).toBe(
    '<div class="todo">Buy &lt;milk&gt; &amp; eggs</div>',
  );
});

test("drops event handlers (no events on the server)", () => {
  const html = el(
    "button",
    [onClick<string>("clicked"), class_("b")],
    [text("Go")],
  );
  expect(renderToString(html)).toBe(
    '<button class="b">Go</button>',
  );
});

test("drops animation directives (no animation on the server)", () => {
  const html = el(
    "div",
    [fadeIn(150), class_("box")],
    [text("Hi")],
  );
  expect(renderToString(html)).toBe(
    '<div class="box">Hi</div>',
  );
});

test("emits style_() atomic classes as a class attribute", () => {
  expect(
    renderToString(
      el(
        "div",
        [style_("todo", p(2))],
        [text("hi")],
      ),
    ),
  ).toBe(
    `<div class="todo ${hashClass("|padding:0.5rem")}">hi</div>`,
  );
});

test("a style_() with no classes emits no class attribute", () => {
  expect(
    renderToString(
      el("div", [style_()], [text("x")]),
    ),
  ).toBe("<div>x</div>");
});

test("self-closes void elements", () => {
  expect(
    renderToString(
      input([attr("type", "text")], []),
    ),
  ).toBe('<input type="text" />');
});

test("drops attributes with unsafe names", () => {
  expect(
    renderToString(
      el("div", [attr("on click", "x")], []),
    ),
  ).toBe("<div></div>");
});

test("escapes attribute values that try to break out", () => {
  expect(
    renderToString(
      el("a", [attr("title", '"><script>')], []),
    ),
  ).toBe(
    '<a title="&quot;&gt;&lt;script&gt;"></a>',
  );
});
