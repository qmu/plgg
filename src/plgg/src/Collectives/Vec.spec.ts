import { test, expect, assert } from "vitest";
import {
  isVec,
  asVec,
  isOk,
  isErr,
  mapVec,
  pipe,
  foldrVec,
  foldlVec,
} from "plgg/index";

test("Vec.is should return true for vectors", () => {
  expect(isVec([])).toBe(true);
  expect(isVec([1, 2, 3])).toBe(true);
  expect(isVec(["a", "b", "c"])).toBe(true);
  expect(isVec([1, "a", true, null])).toBe(true);
  expect(isVec(new Array(5))).toBe(true);
  expect(
    isVec(
      Array.from({
        length: 3,
      }),
    ),
  ).toBe(true);
});

test("Vec.is should return false for non-vectors", () => {
  expect(isVec(null)).toBe(false);
  expect(isVec(undefined)).toBe(false);
  expect(isVec({})).toBe(false);
  expect(isVec("vector")).toBe(false);
  expect(isVec(123)).toBe(false);
  expect(isVec(true)).toBe(false);
  expect(
    isVec({
      length: 0,
    }),
  ).toBe(false);
  expect(isVec("")).toBe(false);
});

test("Vec.cast should succeed for vectors", () => {
  const result1 = asVec([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = asVec([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.content).toEqual([1, 2, 3]);

  const result3 = asVec(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.content).toEqual([
    "a",
    "b",
    "c",
  ]);

  const result4 = asVec([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.content).toEqual([
    1,
    "a",
    true,
    null,
  ]);
});

test("Vec.cast should fail for non-vectors", () => {
  const result1 = asVec(null);
  assert(isErr(result1));
  expect(result1.content.message).toBe(
    "Value is not a vector",
  );

  const result2 = asVec(undefined);
  assert(isErr(result2));
  expect(result2.content.message).toBe(
    "Value is not a vector",
  );

  const result3 = asVec({});
  assert(isErr(result3));
  expect(result3.content.message).toBe(
    "Value is not a vector",
  );

  const result4 = asVec("vector");
  assert(isErr(result4));
  expect(result4.content.message).toBe(
    "Value is not a vector",
  );

  const result5 = asVec(123);
  assert(isErr(result5));
  expect(result5.content.message).toBe(
    "Value is not a vector",
  );
});

test("Vec Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapVec(double));
  const r2 = pipe([1, 2, 3], mapVec(double));
  const r3 = pipe([1, 2, 3], mapVec(toString));

  expect(r1).toEqual([]);
  expect(r2).toEqual([2, 4, 6]);
  expect(r3).toEqual(["1", "2", "3"]);
});

test("Vec Functor Laws - Identity", () => {
  const vec = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(vec, mapVec(identity));

  expect(r1).toEqual(vec);
});

test("Vec Functor Laws - Composition", () => {
  const vec = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    vec,
    mapVec((x: number) => g(f(x))),
  );
  const r2 = pipe(vec, mapVec(f), mapVec(g));

  expect(r1).toEqual(r2);
});

test("Vec Foldable - foldr function", () => {
  const add = (x: number, acc: number) => x + acc;
  const concat = (x: string, acc: string) =>
    x + acc;

  const r1 = pipe([], foldrVec(add)(0));
  const r2 = pipe([1, 2, 3], foldrVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldrVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("Vec Foldable - foldl function", () => {
  const add = (acc: number, x: number) => acc + x;
  const concat = (acc: string, x: string) =>
    acc + x;

  const r1 = pipe([], foldlVec(add)(0));
  const r2 = pipe([1, 2, 3], foldlVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldlVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});
