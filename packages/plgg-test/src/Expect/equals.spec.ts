import {
  test,
  check,
  all,
  toBe,
} from "../index.js";
import { deepEqual } from "./equals.js";

test("primitives via Object.is", () =>
  all([
    check(deepEqual(1, 1), toBe(true)),
    check(deepEqual(NaN, NaN), toBe(true)),
    check(deepEqual(0, -0), toBe(false)),
    check(deepEqual("a", "b"), toBe(false)),
  ]));

test("arrays element-wise and length", () =>
  all([
    check(
      deepEqual([1, [2]], [1, [2]]),
      toBe(true),
    ),
    check(
      deepEqual([1, 2], [1, 2, 3]),
      toBe(false),
    ),
  ]));

test("plain objects ignore undefined props", () =>
  check(
    deepEqual({ a: 1, b: undefined }, { a: 1 }),
    toBe(true),
  ));

test("objects ignore function props", () =>
  check(
    deepEqual(
      { a: 1, f: () => 1 },
      { a: 1, f: () => 2 },
    ),
    toBe(true),
  ));

test("Date by time, RegExp by source+flags", () =>
  all([
    check(
      deepEqual(new Date(0), new Date(0)),
      toBe(true),
    ),
    check(deepEqual(/a/g, /a/g), toBe(true)),
    check(deepEqual(/a/g, /a/i), toBe(false)),
  ]));

test("Map and Set structurally", () =>
  all([
    check(
      deepEqual(
        new Map([["a", 1]]),
        new Map([["a", 1]]),
      ),
      toBe(true),
    ),
    check(
      deepEqual(new Set([1, 2]), new Set([1, 2])),
      toBe(true),
    ),
    check(
      deepEqual(new Set([1]), new Set([2])),
      toBe(false),
    ),
  ]));

test("null vs object", () =>
  all([
    check(deepEqual(null, {}), toBe(false)),
    check(deepEqual(null, null), toBe(true)),
  ]));

test("mismatched object tags are unequal", () =>
  all([
    check(deepEqual([1], { 0: 1 }), toBe(false)),
    check(
      deepEqual(new Date(0), {}),
      toBe(false),
    ),
    check(
      deepEqual(new Map(), new Set()),
      toBe(false),
    ),
  ]));

test("differing Date times and Map sizes are unequal", () =>
  all([
    check(
      deepEqual(new Date(0), new Date(1)),
      toBe(false),
    ),
    check(
      deepEqual(new Map([["a", 1]]), new Map()),
      toBe(false),
    ),
    check(
      deepEqual(
        new Map([["a", 1]]),
        new Map([["b", 1]]),
      ),
      toBe(false),
    ),
  ]));

test("objects with differing key counts are unequal", () =>
  check(
    deepEqual({ a: 1, b: 2 }, { a: 1 }),
    toBe(false),
  ));
