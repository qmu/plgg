import { test, expect } from "plgg-test";
import { filter, pipe } from "plgg/index";

test("filter keeps elements matching predicate", () => {
  const result = pipe(
    [1, 2, 3, 4, 5],
    filter((n: number) => n % 2 === 0),
  );
  expect(result).toEqual([2, 4]);
});

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
  expect(strings).toEqual(["hello", "world"]);
  expect(strings.every((s) => typeof s === "string")).toBe(
    true,
  );
});

test("filter returns empty array when no match", () => {
  const result = pipe(
    [1, 2, 3],
    filter((n: number) => n > 10),
  );
  expect(result).toEqual([]);
});

test("filter returns all elements when all match", () => {
  const result = pipe(
    [1, 2, 3],
    filter((n: number) => n > 0),
  );
  expect(result).toEqual([1, 2, 3]);
});

test("filter on empty array yields empty", () => {
  const result = pipe(
    [] as ReadonlyArray<number>,
    filter((n: number) => n > 0),
  );
  expect(result).toEqual([]);
});
