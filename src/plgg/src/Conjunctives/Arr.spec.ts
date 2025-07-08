import { test, expect, assert } from "vitest";
import { Arr, isOk, isErr, Str, Num } from "plgg/index";

test("Arr.is should return true for arrays", () => {
  expect(Arr.is([])).toBe(true);
  expect(Arr.is([1, 2, 3])).toBe(true);
  expect(Arr.is(["a", "b", "c"])).toBe(true);
  expect(Arr.is([1, "a", true, null])).toBe(true);
  expect(Arr.is(new Array(5))).toBe(true);
  expect(Arr.is(Array.from({ length: 3 }))).toBe(true);
});

test("Arr.is should return false for non-arrays", () => {
  expect(Arr.is(null)).toBe(false);
  expect(Arr.is(undefined)).toBe(false);
  expect(Arr.is({})).toBe(false);
  expect(Arr.is("array")).toBe(false);
  expect(Arr.is(123)).toBe(false);
  expect(Arr.is(true)).toBe(false);
  expect(Arr.is({ length: 0 })).toBe(false);
  expect(Arr.is("")).toBe(false);
});

test("Arr.cast should succeed for arrays", () => {
  const result1 = Arr.cast([]);
  assert(isOk(result1));
  expect(result1.ok).toEqual([]);

  const result2 = Arr.cast([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.ok).toEqual([1, 2, 3]);

  const result3 = Arr.cast(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.ok).toEqual(["a", "b", "c"]);

  const result4 = Arr.cast([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.ok).toEqual([1, "a", true, null]);
});

test("Arr.cast should fail for non-arrays", () => {
  const result1 = Arr.cast(null);
  assert(isErr(result1));
  expect(result1.err.message).toBe("Value is not an array");

  const result2 = Arr.cast(undefined);
  assert(isErr(result2));
  expect(result2.err.message).toBe("Value is not an array");

  const result3 = Arr.cast({});
  assert(isErr(result3));
  expect(result3.err.message).toBe("Value is not an array");

  const result4 = Arr.cast("array");
  assert(isErr(result4));
  expect(result4.err.message).toBe("Value is not an array");

  const result5 = Arr.cast(123);
  assert(isErr(result5));
  expect(result5.err.message).toBe("Value is not an array");
});

test("Arr.every should succeed when all elements match predicate", () => {
  const result1 = Arr.every(Str.is)([]);
  assert(isOk(result1));
  expect(result1.ok).toEqual([]);

  const result2 = Arr.every(Str.is)(["a", "b", "c"]);
  assert(isOk(result2));
  expect(result2.ok).toEqual(["a", "b", "c"]);

  const result3 = Arr.every(Num.is)([1, 2, 3]);
  assert(isOk(result3));
  expect(result3.ok).toEqual([1, 2, 3]);

  const result4 = Arr.every((x): x is string => typeof x === "string")([
    "hello",
    "world",
  ]);
  assert(isOk(result4));
  expect(result4.ok).toEqual(["hello", "world"]);
});

test("Arr.every should fail when some elements don't match predicate", () => {
  const result1 = Arr.every(Str.is)([1, 2, 3]);
  assert(isErr(result1));
  expect(result1.err.message).toBe("Array elements do not match predicate");

  const result2 = Arr.every(Str.is)(["a", 1, "c"]);
  assert(isErr(result2));
  expect(result2.err.message).toBe("Array elements do not match predicate");

  const result3 = Arr.every(Num.is)(["a", "b", "c"]);
  assert(isErr(result3));
  expect(result3.err.message).toBe("Array elements do not match predicate");

  const result4 = Arr.every((x): x is number => typeof x === "number")([
    1,
    "2",
    3,
  ]);
  assert(isErr(result4));
  expect(result4.err.message).toBe("Array elements do not match predicate");
});

test("Arr.every with complex predicates", () => {
  // Test with boolean predicate
  const isBool = (x: unknown): x is boolean => typeof x === "boolean";

  const result1 = Arr.every(isBool)([true, false, true]);
  assert(isOk(result1));
  expect(result1.ok).toEqual([true, false, true]);

  const result2 = Arr.every(isBool)([true, "false", true]);
  assert(isErr(result2));
  expect(result2.err.message).toBe("Array elements do not match predicate");

  // Test with null/undefined
  const isNotNull = (x: unknown): x is NonNullable<unknown> => x != null;

  const result3 = Arr.every(isNotNull)([1, "a", true]);
  assert(isOk(result3));
  expect(result3.ok).toEqual([1, "a", true]);

  const result4 = Arr.every(isNotNull)([1, null, true]);
  assert(isErr(result4));
  expect(result4.err.message).toBe("Array elements do not match predicate");
});
