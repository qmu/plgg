import { test, expect, assert } from "vitest";
import { isReadonlyArray, asReadonlyArray, asNum, isOk, isErr } from "plgg/index";

test("isReadonlyArray and asReadonlyArray basic validation", () => {
  expect(isReadonlyArray([1, 2, 3])).toBe(true);
  expect(isReadonlyArray([])).toBe(true);
  expect(isReadonlyArray("test")).toBe(false);

  const result = asReadonlyArray(asNum)([1, 2, 3]);
  assert(isOk(result));
  expect(result.content).toEqual([1, 2, 3]);

  assert(isErr(asReadonlyArray(asNum)(["not", "numbers"])));
});
