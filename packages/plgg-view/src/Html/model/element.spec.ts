import { test, expect } from "vitest";
import {
  el,
  text,
  div,
  button,
} from "plgg-view/Html/model/element";
import { class_ } from "plgg-view/Html/model/Attribute";

test("text builds a Text leaf", () => {
  expect(text("hello")).toEqual({
    __tag: "Text",
    content: { value: "hello" },
  });
});

test("el builds an Element with tag, attributes, children", () => {
  const node = el(
    "section",
    [class_("box")],
    [text("hi")],
  );
  expect(node.__tag).toBe("Element");
  if (node.__tag === "Element") {
    expect(node.content.tag).toBe("section");
    expect(node.content.attributes).toHaveLength(1);
    expect(node.content.children).toHaveLength(1);
  }
});

test("tag helpers set the tag name", () => {
  expect(div([], []).__tag).toBe("Element");
  const b = button([], [text("ok")]);
  if (b.__tag === "Element") {
    expect(b.content.tag).toBe("button");
  }
});
