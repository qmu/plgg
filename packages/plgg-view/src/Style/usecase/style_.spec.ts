import { test, expect } from "vitest";
import {
  p,
  bg,
  color,
} from "plgg-view/Style/usecase/utilities";
import {
  style_,
  hover,
  focus,
  active,
  hashClass,
} from "plgg-view/Style/usecase/style_";

test("hashClass is deterministic and content-addressed", () => {
  expect(hashClass("x")).toBe(hashClass("x"));
  expect(hashClass("x")).not.toBe(hashClass("y"));
  expect(hashClass("x").startsWith("c")).toBe(
    true,
  );
});

test("style_(styles) builds one atomic class + rule per declaration", () => {
  const a = style_(p(3));
  expect(a.__tag).toBe("Css");
  if (a.__tag === "Css") {
    const cls = hashClass("|padding:0.75rem");
    expect(a.content.rules).toEqual([
      {
        className: cls,
        selector: "",
        prop: "padding",
        value: "0.75rem",
      },
    ]);
    expect(a.content.classes).toBe(cls);
  }
});

test("style_ prepends literal class hooks (which carry no rule)", () => {
  const a = style_("todo", p(3));
  if (a.__tag === "Css") {
    expect(a.content.classes).toBe(
      "todo " + hashClass("|padding:0.75rem"),
    );
    expect(a.content.rules).toHaveLength(1);
  }
});

test("variants carry a pseudo-class selector on every atom", () => {
  const a = style_(
    hover(bg("primary"), color("primary-text")),
  );
  if (a.__tag === "Css") {
    expect(
      a.content.rules.map((r) => r.selector),
    ).toEqual([":hover", ":hover"]);
    expect(
      a.content.rules.map((r) => r.prop),
    ).toEqual(["background-color", "color"]);
    expect(
      a.content.classes.split(" "),
    ).toHaveLength(2);
  }
  expect(focus(p(1)).selector).toBe(":focus");
  expect(active(p(1)).selector).toBe(":active");
});

test("style_() with no parts is an empty class set", () => {
  const a = style_();
  if (a.__tag === "Css") {
    expect(a.content.classes).toBe("");
    expect(a.content.rules).toEqual([]);
  }
});
