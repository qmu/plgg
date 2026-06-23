import { test, expect } from "plgg-test";
import { isVecLike } from "plgg/index";

test("isVecLike returns true for arrays", () => {
  expect(isVecLike([])).toBe(true);
  expect(isVecLike([1, 2, 3])).toBe(true);
  expect(isVecLike(["a"])).toBe(true);
  const mut: number[] = [];
  mut.push(1);
  expect(isVecLike(mut)).toBe(true);
});

test("isVecLike returns false for non-vector values", () => {
  expect(isVecLike(null)).toBe(false);
  expect(isVecLike(undefined)).toBe(false);
  expect(isVecLike({})).toBe(false);
  expect(isVecLike("string")).toBe(false);
  expect(isVecLike(42)).toBe(false);
  expect(isVecLike(true)).toBe(false);
  expect(isVecLike(0n)).toBe(false);
});
