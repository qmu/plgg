import { test, expect } from "vitest";
import { isFunc } from "plgg/index";

test("isFunc basic validation", () => {
  expect(isFunc(() => {})).toBe(true);
  expect(isFunc(function() {})).toBe(true);
  expect(isFunc((x: number) => x + 1)).toBe(true);
  expect(isFunc("not a function")).toBe(false);
  expect(isFunc(123)).toBe(false);
  expect(isFunc(null)).toBe(false);
});
