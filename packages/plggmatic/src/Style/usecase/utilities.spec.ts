import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import {
  bg,
  color,
  textColor,
  border,
  borderColor,
  outline,
  basis,
  fluid,
} from "plggmatic/Style/usecase/utilities";

test("color atoms resolve through --pm-* vars", () =>
  all([
    check(
      bg("surface"),
      toEqual([
        {
          prop: "background-color",
          value: "var(--pm-surface)",
        },
      ]),
    ),
    check(
      color("text"),
      toEqual([
        {
          prop: "color",
          value: "var(--pm-text)",
        },
      ]),
    ),
    check(
      textColor("muted"),
      toEqual([
        {
          prop: "color",
          value: "var(--pm-muted)",
        },
      ]),
    ),
    check(
      borderColor("primary-base"),
      toEqual([
        {
          prop: "border-color",
          value: "var(--pm-primary-base)",
        },
      ]),
    ),
    check(
      outline("primary-base"),
      toEqual([
        {
          prop: "outline",
          value: "2px solid var(--pm-primary-base)",
        },
      ]),
    ),
  ]));

test("border is a three-atom hairline in the var", () =>
  check(
    border,
    toEqual([
      { prop: "border-width", value: "1px" },
      { prop: "border-style", value: "solid" },
      {
        prop: "border-color",
        value: "var(--pm-border)",
      },
    ]),
  ));

test("column tracks are whole-shorthand atoms", () =>
  all([
    check(
      basis("220px"),
      toEqual([
        { prop: "flex", value: "0 0 220px" },
        { prop: "width", value: "220px" },
      ]),
    ),
    check(
      fluid,
      toEqual([
        { prop: "flex", value: "1 1 auto" },
        { prop: "min-width", value: "0" },
      ]),
    ),
  ]));
