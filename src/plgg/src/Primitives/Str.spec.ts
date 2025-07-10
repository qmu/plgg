import { test, expect, assert } from "vitest";
import { isStr, castStr, isOk, isErr } from "plgg/index";

test("Str.is type guard", () => {
  expect(isStr("hello")).toBe(true);
  expect(isStr("")).toBe(true);
  expect(isStr("123")).toBe(true);
  expect(isStr(123)).toBe(false);
  expect(isStr(true)).toBe(false);
  expect(isStr(null)).toBe(false);
  expect(isStr(undefined)).toBe(false);
  expect(isStr({})).toBe(false);
  expect(isStr([])).toBe(false);
});

test("Str.cast validation", async () => {
  const validResult = castStr("hello");
  assert(isOk(validResult));
  expect(validResult.ok).toBe("hello");

  const emptyResult = castStr("");
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toBe("");

  const numberResult = castStr(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("123 is not a string");

  const boolResult = castStr(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("true is not a string");

  const nullResult = castStr(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("null is not a string");

  const undefinedResult = castStr(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("undefined is not a string");
});
