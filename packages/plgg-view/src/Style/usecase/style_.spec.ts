import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toHaveLength,
  not,
} from "plgg-test";
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

test("hashClass is deterministic and content-addressed", () =>
  all([
    check(hashClass("x"), toBe(hashClass("x"))),
    check(
      hashClass("x"),
      not(toBe(hashClass("y"))),
    ),
    check(
      hashClass("x").startsWith("c"),
      toBe(true),
    ),
  ]));

test("style_(styles) builds one atomic class + rule per declaration", () => {
  const a = style_(p(3));
  if (a.__tag !== "Css") {
    return check(a.__tag, toBe("Css"));
  }
  const cls = hashClass("|padding:0.75rem");
  return all([
    check(a.content.rules, toEqual([
      {
        className: cls,
        selector: "",
        prop: "padding",
        value: "0.75rem",
      },
    ])),
    check(a.content.classes, toBe(cls)),
  ]);
});

test("style_ prepends literal class hooks (which carry no rule)", () => {
  const a = style_("todo", p(3));
  if (a.__tag !== "Css") {
    return check(a.__tag, toBe("Css"));
  }
  return all([
    check(
      a.content.classes,
      toBe(
        "todo " + hashClass("|padding:0.75rem"),
      ),
    ),
    check(a.content.rules, toHaveLength(1)),
  ]);
});

test("variants carry a pseudo-class selector on every atom", () => {
  const a = style_(
    hover(bg("primary"), color("primary-text")),
  );
  return all([
    a.__tag === "Css"
      ? all([
          check(
            a.content.rules.map((r) => r.selector),
            toEqual([":hover", ":hover"]),
          ),
          check(
            a.content.rules.map((r) => r.prop),
            toEqual([
              "background-color",
              "color",
            ]),
          ),
          check(
            a.content.classes.split(" "),
            toHaveLength(2),
          ),
        ])
      : check(a.__tag, toBe("Css")),
    check(focus(p(1)).selector, toBe(":focus")),
    check(active(p(1)).selector, toBe(":active")),
  ]);
});

test("style_() with no parts is an empty class set", () => {
  const a = style_();
  if (a.__tag !== "Css") {
    return check(a.__tag, toBe("Css"));
  }
  return all([
    check(a.content.classes, toBe("")),
    check(a.content.rules, toEqual([])),
  ]);
});
