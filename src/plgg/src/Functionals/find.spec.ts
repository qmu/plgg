import { test, expect, assert } from "vitest";
import { find, isOk, isErr } from "plgg/index";

test("find with predicate function returns Ok when found", () => {
  const numbers = [1, 2, 3, 4, 5];
  const findEven = find(
    (n: number) => n % 2 === 0,
  );

  const result = findEven(numbers);
  assert(isOk(result));
  expect(result.content).toBe(2);
});

test("find with predicate function returns Err when not found", () => {
  const numbers = [1, 3, 5];
  const findEven = find(
    (n: number) => n % 2 === 0,
  );

  const result = findEven(numbers);
  assert(isErr(result));
  expect(result.content.message).toBe(
    "No element found matching the predicate",
  );
});

test("find with object and custom error message", () => {
  const numbers = [1, 2, 3];
  const findNegative = find({
    predicate: (n: number) => n < 0,
    errMessage: "No negative number found",
  });

  const result = findNegative(numbers);
  assert(isErr(result));
  expect(result.content.message).toBe(
    "No negative number found",
  );
});

test("find with object without custom error message", () => {
  const numbers = [1, 2, 3];
  const findLarge = find<number>({
    predicate: (n) => n > 100,
  });

  const result = findLarge(numbers);
  assert(isErr(result));
  expect(result.content.message).toBe(
    "No element found matching the predicate",
  );
});

test("find with object returns Ok when found", () => {
  const numbers = [1, 2, 3];
  const findTwo = find<number>({
    predicate: (n) => n === 2,
    errMessage: "Two not found",
  });

  const result = findTwo(numbers);
  assert(isOk(result));
  expect(result.content).toBe(2);
});
