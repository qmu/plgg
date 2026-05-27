import { test, expect } from "vitest";
import { h, text } from "plgg-view/index";

test("h builds an element with props and normalized children", () => {
  const node = h(
    "a",
    { href: "/x" },
    "click ",
    h("b", null, "here"),
  );
  expect(node.__tag).toBe("Element");
  if (node.__tag === "Element") {
    expect(node.content.tag).toBe("a");
    expect(node.content.props).toEqual({ href: "/x" });
    expect(node.content.children[0]).toEqual(text("click "));
    expect(node.content.children[1]?.__tag).toBe("Element");
  }
});

test("h treats null props as an empty attribute map", () => {
  const node = h("br", null);
  expect(node.__tag).toBe("Element");
  if (node.__tag === "Element") {
    expect(node.content.props).toEqual({});
    expect(node.content.children).toEqual([]);
  }
});

test("h drops nothing-children and flattens arrays", () => {
  const node = h("ul", null, [
    h("li", null, "a"),
    false,
    h("li", null, "b"),
  ]);
  if (node.__tag === "Element") {
    expect(node.content.children.length).toBe(2);
  }
});
