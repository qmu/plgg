import { test, expect } from "plgg-test/index";
import { deepEqual } from "plgg-test/Expect/equals";

test("primitives via Object.is", () => {
  expect(deepEqual(1, 1)).toBe(true);
  expect(deepEqual(NaN, NaN)).toBe(true);
  expect(deepEqual(0, -0)).toBe(false);
  expect(deepEqual("a", "b")).toBe(false);
});

test("arrays element-wise and length", () => {
  expect(deepEqual([1, [2]], [1, [2]])).toBe(
    true,
  );
  expect(deepEqual([1, 2], [1, 2, 3])).toBe(
    false,
  );
});

test("plain objects ignore undefined props", () => {
  expect(
    deepEqual({ a: 1, b: undefined }, { a: 1 }),
  ).toBe(true);
});

test("objects ignore function props", () => {
  expect(
    deepEqual(
      { a: 1, f: () => 1 },
      { a: 1, f: () => 2 },
    ),
  ).toBe(true);
});

test("Date by time, RegExp by source+flags", () => {
  expect(
    deepEqual(new Date(0), new Date(0)),
  ).toBe(true);
  expect(deepEqual(/a/g, /a/g)).toBe(true);
  expect(deepEqual(/a/g, /a/i)).toBe(false);
});

test("Map and Set structurally", () => {
  expect(
    deepEqual(
      new Map([["a", 1]]),
      new Map([["a", 1]]),
    ),
  ).toBe(true);
  expect(
    deepEqual(new Set([1, 2]), new Set([1, 2])),
  ).toBe(true);
  expect(
    deepEqual(new Set([1]), new Set([2])),
  ).toBe(false);
});

test("null vs object", () => {
  expect(deepEqual(null, {})).toBe(false);
  expect(deepEqual(null, null)).toBe(true);
});

test("mismatched object tags are unequal", () => {
  expect(deepEqual([1], { 0: 1 })).toBe(false);
  expect(deepEqual(new Date(0), {})).toBe(false);
  expect(deepEqual(new Map(), new Set())).toBe(
    false,
  );
});

test("differing Date times and Map sizes are unequal", () => {
  expect(
    deepEqual(new Date(0), new Date(1)),
  ).toBe(false);
  expect(
    deepEqual(new Map([["a", 1]]), new Map()),
  ).toBe(false);
  expect(
    deepEqual(
      new Map([["a", 1]]),
      new Map([["b", 1]]),
    ),
  ).toBe(false);
});

test("objects with differing key counts are unequal", () => {
  expect(
    deepEqual({ a: 1, b: 2 }, { a: 1 }),
  ).toBe(false);
});
