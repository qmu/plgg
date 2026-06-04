import { test, expect } from "vitest";
import { renderToString } from "plgg-view/Html/usecase/renderToString";
import {
  el,
  text,
} from "plgg-view/Html/model/element";
import { style_ } from "plgg-view/Style/usecase/style_";
import {
  p,
  flex,
  gap,
  bg,
  color,
} from "plgg-view/Style/usecase/utilities";

test("style_ joins utilities into one style attribute", () => {
  expect(style_(p(3), flex, gap(2))).toEqual({
    __tag: "Attr",
    content: {
      name: "style",
      value:
        "padding:0.75rem;display:flex;gap:0.5rem",
    },
  });
});

test("style_ dedups by property, last wins", () => {
  expect(style_(p(2), p(4))).toEqual({
    __tag: "Attr",
    content: {
      name: "style",
      value: "padding:1rem",
    },
  });
});

test("style_ with no parts yields an empty style", () => {
  expect(style_()).toEqual({
    __tag: "Attr",
    content: { name: "style", value: "" },
  });
});

test("a styled element renders its inline style on the server", () => {
  const html = el(
    "div",
    [
      style_(
        bg("primary"),
        color("primary-text"),
        p(2),
      ),
    ],
    [text("hi")],
  );
  expect(renderToString(html)).toBe(
    '<div style="background-color:#2563eb;color:#ffffff;padding:0.5rem">hi</div>',
  );
});
