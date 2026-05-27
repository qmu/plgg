import { test, expect } from "vitest";
import { foldVNode, VNodeAlgebra } from "plgg-view/index";

// A toy algebra: fold the tree to an s-expression-ish string. Proves children
// are folded before their parent and that each node kind routes to its handler.
const sexpr: VNodeAlgebra<string> = {
  element: (tag, props, children) =>
    `(${tag}${
      Object.keys(props).length ? ` ${JSON.stringify(props)}` : ""
    }${children.length ? ` ${children.join(" ")}` : ""})`,
  text: (value) => `"${value}"`,
  fragment: (children) => `[${children.join(" ")}]`,
};

test("foldVNode routes each node kind and folds children first", () => {
  const tree = (
    <ul class="x">
      <li>a</li>
      <li>b</li>
    </ul>
  );
  expect(foldVNode(sexpr)(tree)).toBe(
    '(ul {"class":"x"} (li "a") (li "b"))',
  );
});

test("foldVNode handles text and fragments", () => {
  expect(foldVNode(sexpr)(<>{"hi"}</>)).toBe('["hi"]');
  expect(
    foldVNode(sexpr)(
      <>
        <b>x</b>
        {"y"}
      </>,
    ),
  ).toBe('[(b "x") "y"]');
});

test("foldVNode can compute over the tree (e.g. node count)", () => {
  const count: VNodeAlgebra<number> = {
    element: (_t, _p, kids) => 1 + kids.reduce((a, b) => a + b, 0),
    text: () => 1,
    fragment: (kids) => kids.reduce((a, b) => a + b, 0),
  };
  expect(
    foldVNode(count)(
      <section>
        <h1>title</h1>
        <p>body</p>
      </section>,
    ),
  ).toBe(5); // section + h1 + "title" + p + "body"
});
