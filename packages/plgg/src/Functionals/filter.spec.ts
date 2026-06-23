import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { filter, pipe } from "plgg/index";

test("filter keeps elements matching predicate", () =>
  check(
    pipe(
      [1, 2, 3, 4, 5],
      filter((n: number) => n % 2 === 0),
    ),
    toEqual([2, 4]),
  ));

test("filter narrows types with type guard predicate", () => {
  const items: Array<string | number> = [
    1,
    "hello",
    2,
    "world",
  ];
  const strings = pipe(
    items,
    filter(
      (x): x is string => typeof x === "string",
    ),
  );
  return all([
    check(strings, toEqual(["hello", "world"])),
    check(
      strings.every(
        (s) => typeof s === "string",
      ),
      toBe(true),
    ),
  ]);
});

test("filter returns empty array when no match", () =>
  check(
    pipe(
      [1, 2, 3],
      filter((n: number) => n > 10),
    ),
    toEqual([]),
  ));

test("filter returns all elements when all match", () =>
  check(
    pipe(
      [1, 2, 3],
      filter((n: number) => n > 0),
    ),
    toEqual([1, 2, 3]),
  ));

test("filter on empty array yields empty", () =>
  check(
    pipe(
      [] as ReadonlyArray<number>,
      filter((n: number) => n > 0),
    ),
    toEqual([]),
  ));
