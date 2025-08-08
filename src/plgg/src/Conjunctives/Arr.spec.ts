import { test, expect, assert } from "vitest";
import {
  isArr,
  every,
  asArr,
  isOk,
  isErr,
  isStr,
  isNum,
  mapArr,
  applyArr,
  ofArr,
  chainArr,
  pipe,
} from "plgg/index";

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
  const result1 = asArr([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = asArr([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.content).toEqual([1, 2, 3]);

  const result3 = asArr(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.content).toEqual(["a", "b", "c"]);

  const result4 = asArr([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.content).toEqual([1, "a", true, null]);
});

test("Arr.cast should fail for non-arrays", () => {
  const result1 = asArr(null);
  assert(isErr(result1));
  expect(result1.content.message).toBe("Value is not an array");

  const result2 = asArr(undefined);
  assert(isErr(result2));
  expect(result2.content.message).toBe("Value is not an array");

  const result3 = asArr({});
  assert(isErr(result3));
  expect(result3.content.message).toBe("Value is not an array");

  const result4 = asArr("array");
  assert(isErr(result4));
  expect(result4.content.message).toBe("Value is not an array");

  const result5 = asArr(123);
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

test("Arr Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapArr(double));
  const r2 = pipe([1, 2, 3], mapArr(double));
  const r3 = pipe([1, 2, 3], mapArr(toString));

  expect(r1).toEqual([]);
  expect(r2).toEqual([2, 4, 6]);
  expect(r3).toEqual(["1", "2", "3"]);
});

test("Arr Monad - of function", () => {
  const r1 = pipe(1, ofArr);
  const r2 = pipe("hello", ofArr);
  const r3 = pipe(null, ofArr);

  expect(r1).toEqual([1]);
  expect(r2).toEqual(["hello"]);
  expect(r3).toEqual([null]);
});

test("Arr Monad - chain function (flatMap)", () => {
  const duplicate = (x: number) => [x, x];
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);

  const r1 = pipe([], chainArr(duplicate));
  const r2 = pipe([1, 2, 3], chainArr(duplicate));
  const r3 = pipe([2, 3, 1], chainArr(range));

  expect(r1).toEqual([]);
  expect(r2).toEqual([1, 1, 2, 2, 3, 3]);
  expect(r3).toEqual([0, 1, 0, 1, 2, 0]);
});

test("Arr Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const multiply = (x: number) => (y: number) => x * y;
  const curryConcat = (a: string) => (b: string) => a + b;

  const r1 = pipe([1, 2], applyArr([add(1), multiply(2)]));
  const r2 = pipe([], applyArr([add(0)]));
  const r3 = pipe([1, 2], applyArr([]));
  const r4 = pipe(
    ["world", "there"],
    applyArr([curryConcat("hello "), curryConcat("hi ")]),
  );

  expect(r1).toEqual([2, 3, 2, 4]);
  expect(r2).toEqual([]);
  expect(r3).toEqual([]);
  expect(r4).toEqual(["hello world", "hello there", "hi world", "hi there"]);
});

test("Arr Monad Laws - Left Identity", () => {
  const f = (x: number) => [x, x * 2];
  const a = 5;

  const r1 = pipe(a, ofArr, chainArr(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("Arr Monad Laws - Right Identity", () => {
  const m = [1, 2, 3];

  const r1 = pipe(m, chainArr(ofArr));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("Arr Monad Laws - Associativity", () => {
  const f = (x: number) => [x, x + 1];
  const g = (x: number) => [x * 2];
  const m = [1, 2];

  const r1 = pipe(m, chainArr(f), chainArr(g));
  const r2 = pipe(
    m,
    chainArr((x: number) => pipe(x, f, chainArr(g))),
  );

  expect(r1).toEqual(r2);
});

test("Arr Functor Laws - Identity", () => {
  const arr = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(arr, mapArr(identity));

  expect(r1).toEqual(arr);
});

test("Arr Functor Laws - Composition", () => {
  const arr = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    arr,
    mapArr((x: number) => g(f(x))),
  );
  const r2 = pipe(arr, mapArr(f), mapArr(g));

  expect(r1).toEqual(r2);
});
