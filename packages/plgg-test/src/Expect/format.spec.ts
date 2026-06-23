import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test/index";
import { formatValue } from "plgg-test/Expect/format";

test("primitives", () =>
  all([
    check(formatValue(null), toBe("null")),
    check(
      formatValue(undefined),
      toBe("undefined"),
    ),
    check(formatValue("x"), toBe('"x"')),
    check(formatValue(42), toBe("42")),
    check(formatValue(7n), toBe("7n")),
    check(formatValue(true), toBe("true")),
  ]));

test("functions", () =>
  check(
    formatValue(function named() {}),
    toBe("[Function named]"),
  ));

test("arrays and objects", () =>
  all([
    check(formatValue([1, 2]), toBe("[1, 2]")),
    check(
      formatValue({ a: 1 }),
      toBe("{ a: 1 }"),
    ),
  ]));

test("errors", () =>
  check(
    formatValue(new Error("boom")),
    toBe("[Error: boom]"),
  ));

test("depth guard caps nesting", () => {
  const deep = {
    a: {
      b: { c: { d: { e: 1 } } },
    },
  };
  return check(
    formatValue(deep),
    toContain("[…]"),
  );
});
