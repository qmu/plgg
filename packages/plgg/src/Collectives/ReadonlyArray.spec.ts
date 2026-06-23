import { test, expect, assert } from "plgg-test";
import {
  isReadonlyArray,
  asReadonlyArray,
  asNum,
  isOk,
  isErr,
} from "plgg/index";

test("isReadonlyArray and asReadonlyArray basic validation", () => {
  expect(isReadonlyArray([1, 2, 3])).toBe(true);
  expect(isReadonlyArray([])).toBe(true);
  expect(isReadonlyArray("test")).toBe(false);

  const result = asReadonlyArray(asNum)([1, 2, 3]);
  assert(isOk(result));
  expect(result.content).toEqual([1, 2, 3]);

  assert(
    isErr(asReadonlyArray(asNum)(["not", "numbers"])),
  );
});

test("asReadonlyArray fails when value is not an array", () => {
  const result = asReadonlyArray(asNum)(
    "not an array",
  );
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Value is not an array",
  );
});

test("asReadonlyArray fails for null element", () => {
  const result = asReadonlyArray(asNum)([
    1,
    null,
    3,
  ]);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "index 1 is undefined",
  );
});

test("asReadonlyArray fails for undefined element", () => {
  const result = asReadonlyArray(asNum)([
    1,
    undefined,
    3,
  ]);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "index 1 is undefined",
  );
});

test("asReadonlyArray failure carries parent error", () => {
  const result = asReadonlyArray(asNum)([1, "no", 3]);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "index 1 failed validation",
  );
  expect(
    result.content.content.sibling,
  ).toBeDefined();
});

test("asReadonlyArray succeeds on empty array", () => {
  const result = asReadonlyArray(asNum)([]);
  assert(isOk(result));
  expect(result.content).toEqual([]);
});
