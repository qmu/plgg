import { test, expect } from "vitest";
import {
  el,
  text,
} from "plgg-view/Html/model/element";
import {
  class_,
  onClick,
  fadeIn,
} from "plgg-view/Html/model/Attribute";
import {
  style_,
  hover,
  hashClass,
} from "plgg-view/Style/usecase/style_";
import {
  p,
  bg,
} from "plgg-view/Style/usecase/utilities";
import { collectCss } from "plgg-view/Html/usecase/collectCss";

test("collectCss renders the atomic rules of a tree (base + :hover)", () => {
  const tree = el(
    "div",
    [style_(p(3), hover(bg("primary")))],
    [text("x")],
  );
  const sheet = collectCss(tree);
  expect(sheet).toContain(
    `.${hashClass("|padding:0.75rem")}{padding:0.75rem}`,
  );
  expect(sheet).toContain(
    ":hover{background-color:#2563eb}",
  );
});

test("collectCss dedups an atom used on many elements", () => {
  const tree = el(
    "ul",
    [],
    [
      el("li", [style_(p(3))], []),
      el("li", [style_(p(3))], []),
    ],
  );
  const cls = hashClass("|padding:0.75rem");
  const sheet = collectCss(tree);
  // the rule body appears exactly once despite two uses
  expect(sheet.split(`.${cls}{`).length - 1).toBe(
    1,
  );
});

test("collectCss skips static attrs, handlers, animations, and text", () => {
  const tree = el(
    "button",
    [
      class_("x"),
      onClick<string>("go"),
      fadeIn(100),
      style_(p(2)),
    ],
    [text("Go")],
  );
  expect(collectCss(tree)).toBe(
    `.${hashClass("|padding:0.5rem")}{padding:0.5rem}`,
  );
});

test("a tree with no style_() atoms yields an empty sheet", () => {
  expect(
    collectCss(
      el("div", [class_("x")], [text("hi")]),
    ),
  ).toBe("");
});
