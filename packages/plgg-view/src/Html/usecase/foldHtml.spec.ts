import { test, check, toBe } from "plgg-test";
import {
  el,
  text,
  raw,
} from "plgg-view/Html/model/element";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";

// A fold that counts the nodes in a tree — exercises every algebra arm.
const countNodes = foldHtml<never, number>({
  text: () => 1,
  raw: () => 1,
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
  return check(countNodes(tree), toBe(5));
});

test("foldHtml folds a bare text node", () =>
  check(countNodes(text("x")), toBe(1)));

test("foldHtml folds a raw passthrough node via its own arm", () =>
  check(countNodes(raw("<b>x</b>")), toBe(1)));

test("foldHtml counts a raw child alongside element and text", () =>
  check(
    countNodes(
      el("div", [], [text("a"), raw("<i>b</i>")]),
    ),
    // div + text + raw = 3
    toBe(3),
  ));
