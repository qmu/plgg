import {
  test,
  check,
  all,
  toBe,
} from "../index.js";
import { deepEqual } from "./equals.js";
import { ok, err, some, none } from "plgg";

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

// Gate B — `deepEqual` ≡ vitest `toEqual` on the plgg domain values the
// corpus actually asserts over (81 `toEqual` sites). Box-tagged
// Option/Result are plain `{ __tag, content }` records, so structural
// `deepEqual` must compare them by tag AND content, including when
// nested. This is the parity the bulk U2 rewrite relies on.
test("Box-tagged Result/Option equal by tag + content", () =>
  all([
    check(deepEqual(ok(1), ok(1)), toBe(true)),
    check(deepEqual(err(1), err(1)), toBe(true)),
    check(
      deepEqual(some("x"), some("x")),
      toBe(true),
    ),
    check(deepEqual(none(), none()), toBe(true)),
    // same content, different tag must NOT be equal (Ok 1 ≠ Err 1).
    check(deepEqual(ok(1), err(1)), toBe(false)),
    // same tag, different content.
    check(deepEqual(ok(1), ok(2)), toBe(false)),
    // Some(x) ≠ None.
    check(
      deepEqual(some("x"), none()),
      toBe(false),
    ),
  ]));

test("nested Box-tagged values equal recursively", () =>
  all([
    check(
      deepEqual(ok(some(1)), ok(some(1))),
      toBe(true),
    ),
    check(
      deepEqual(
        ok({ items: [some(1), none()] }),
        ok({ items: [some(1), none()] }),
      ),
      toBe(true),
    ),
    check(
      deepEqual(ok(some(1)), ok(some(2))),
      toBe(false),
    ),
    check(
      deepEqual(ok(some(1)), ok(none())),
      toBe(false),
    ),
  ]));

test("class instances compare by own enumerable fields", () => {
  class Point {
    constructor(
      readonly x: number,
      readonly y: number,
    ) {}
  }
  return all([
    check(
      deepEqual(new Point(1, 2), new Point(1, 2)),
      toBe(true),
    ),
    check(
      deepEqual(new Point(1, 2), new Point(1, 3)),
      toBe(false),
    ),
  ]);
});
