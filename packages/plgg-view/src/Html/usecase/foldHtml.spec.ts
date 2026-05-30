import { test, expect } from "vitest";
import {
  el,
  text,
} from "plgg-view/Html/model/element";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";

// A fold that counts the nodes in a tree — exercises both algebra arms.
const countNodes = foldHtml<never, number>({
  text: () => 1,
  element: (_tag, _attrs, children) =>
    1 + children.reduce((a, b) => a + b, 0),
});

test("foldHtml recurses children first (catamorphism)", () => {
  const tree = el(
    "ul",
    [],
    [
      el("li", [], [text("a")]),
      el("li", [], [text("b")]),
    ],
  );
  // ul + 2 li + 2 text = 5
  expect(countNodes(tree)).toBe(5);
});

test("foldHtml folds a bare text node", () => {
  expect(countNodes(text("x"))).toBe(1);
});
