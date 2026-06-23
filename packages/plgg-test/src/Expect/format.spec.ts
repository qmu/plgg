import { test, expect } from "plgg-test/index";
import { formatValue } from "plgg-test/Expect/format";

test("primitives", () => {
  expect(formatValue(null)).toBe("null");
  expect(formatValue(undefined)).toBe(
    "undefined",
  );
  expect(formatValue("x")).toBe('"x"');
  expect(formatValue(42)).toBe("42");
  expect(formatValue(7n)).toBe("7n");
  expect(formatValue(true)).toBe("true");
});

test("functions", () => {
  expect(formatValue(function named() {})).toBe(
    "[Function named]",
  );
});

test("arrays and objects", () => {
  expect(formatValue([1, 2])).toBe("[1, 2]");
  expect(formatValue({ a: 1 })).toBe("{ a: 1 }");
});

test("errors", () => {
  expect(formatValue(new Error("boom"))).toBe(
    "[Error: boom]",
  );
});

test("depth guard caps nesting", () => {
  const deep = {
    a: {
      b: { c: { d: { e: 1 } } },
    },
  };
  expect(formatValue(deep)).toContain("[…]");
});
