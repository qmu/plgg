import { test, expect } from "vitest";
import { pass } from "plgg/index";

test("pass returns its argument unchanged (identity function)", () => {
  // Test with different types
  expect(pass(42)).toBe(42);
  expect(pass("hello")).toBe("hello");
  expect(pass(true)).toBe(true);
  expect(pass(false)).toBe(false);
  expect(pass(null)).toBe(null);
  expect(pass(undefined)).toBe(undefined);

  // Test with objects (should return same reference)
  const obj = { foo: "bar" };
  expect(pass(obj)).toBe(obj);

  // Test with arrays (should return same reference)
  const arr = [1, 2, 3];
  expect(pass(arr)).toBe(arr);

  // Test with functions
  const fn = () => "test";
  expect(pass(fn)).toBe(fn);
});
