import { test, expect, assert } from "vitest";
import { isArr, every, castArr, isOk, isErr, isStr, isNum } from "plgg/index";

test("Arr.is should return true for arrays", () => {
  expect(isArr([])).toBe(true);
  expect(isArr([1, 2, 3])).toBe(true);
  expect(isArr(["a", "b", "c"])).toBe(true);
  expect(isArr([1, "a", true, null])).toBe(true);
  expect(isArr(new Array(5))).toBe(true);
  expect(isArr(Array.from({ length: 3 }))).toBe(true);
});

test("Arr.is should return false for non-arrays", () => {
  expect(isArr(null)).toBe(false);
  expect(isArr(undefined)).toBe(false);
  expect(isArr({})).toBe(false);
  expect(isArr("array")).toBe(false);
  expect(isArr(123)).toBe(false);
  expect(isArr(true)).toBe(false);
  expect(isArr({ length: 0 })).toBe(false);
  expect(isArr("")).toBe(false);
});

test("Arr.cast should succeed for arrays", () => {
  const result1 = castArr([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = castArr([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.content).toEqual([1, 2, 3]);

  const result3 = castArr(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.content).toEqual(["a", "b", "c"]);

  const result4 = castArr([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.content).toEqual([1, "a", true, null]);
});

test("Arr.cast should fail for non-arrays", () => {
  const result1 = castArr(null);
  assert(isErr(result1));
  expect(result1.content.message).toBe("Value is not an array");

  const result2 = castArr(undefined);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Value is not an array");

  const result3 = castArr({});
  assert(isErr(result3));
  expect(result3.content.message).toBe("Value is not an array");

  const result4 = castArr("array");
  assert(isErr(result4));
  expect(result4.content.message).toBe("Value is not an array");

  const result5 = castArr(123);
  assert(isErr(result5));
  expect(result5.content.message).toBe("Value is not an array");
});

test("Arr.every should succeed when all elements match predicate", () => {
  const result1 = every(isStr)([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = every(isStr)(["a", "b", "c"]);
  assert(isOk(result2));
  expect(result2.content).toEqual(["a", "b", "c"]);

  const result3 = every(isNum)([1, 2, 3]);
  assert(isOk(result3));
  expect(result3.content).toEqual([1, 2, 3]);

  const result4 = every((x): x is string => typeof x === "string")([
    "hello",
    "world",
  ]);
  assert(isOk(result4));
  expect(result4.content).toEqual(["hello", "world"]);
});

test("Arr.every should fail when some elements don't match predicate", () => {
  const result1 = every(isStr)([1, 2, 3]);
  assert(isErr(result1));
  expect(result1.content.message).toBe("Array elements do not match predicate");

  const result2 = every(isStr)(["a", 1, "c"]);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Array elements do not match predicate");

  const result3 = every(isNum)(["a", "b", "c"]);
  assert(isErr(result3));
  expect(result3.content.message).toBe("Array elements do not match predicate");

  const result4 = every((x): x is number => typeof x === "number")([1, "2", 3]);
  assert(isErr(result4));
  expect(result4.content.message).toBe("Array elements do not match predicate");
});

test("Arr.every with complex predicates", () => {
  // Test with boolean predicate
  const isBool = (x: unknown): x is boolean => typeof x === "boolean";

  const result1 = every(isBool)([true, false, true]);
  assert(isOk(result1));
  expect(result1.content).toEqual([true, false, true]);

  const result2 = every(isBool)([true, "false", true]);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Array elements do not match predicate");

  // Test with null/undefined
  const isNotNull = (x: unknown): x is unknown => x != null;

  const result3 = every(isNotNull)([1, "a", true]);
  assert(isOk(result3));
  expect(result3.content).toEqual([1, "a", true]);

  const result4 = every(isNotNull)([1, null, true]);
  assert(isErr(result4));
  expect(result4.content.message).toBe("Array elements do not match predicate");
});
