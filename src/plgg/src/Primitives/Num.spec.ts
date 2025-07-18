import { test, expect, assert } from "vitest";
import { isNum, asNum, isOk, isErr } from "plgg/index";

test("Num.is type guard", () => {
  expect(isNum(123)).toBe(true);
  expect(isNum(0)).toBe(true);
  expect(isNum(-123)).toBe(true);
  expect(isNum(3.14)).toBe(true);
  expect(isNum(Infinity)).toBe(true);
  expect(isNum(-Infinity)).toBe(true);
  expect(isNum(NaN)).toBe(true);
  expect(isNum("123")).toBe(false);
  expect(isNum(true)).toBe(false);
  expect(isNum(null)).toBe(false);
  expect(isNum(undefined)).toBe(false);
  expect(isNum({})).toBe(false);
  expect(isNum([])).toBe(false);
});

test("Num.cast validation", async () => {
  const validResult = asNum(123);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(123);

  const zeroResult = asNum(0);
  assert(isOk(zeroResult));
  expect(validResult.ok).toBe(123);

  const negativeResult = asNum(-123);
  assert(isOk(negativeResult));
  expect(negativeResult.ok).toBe(-123);

  const floatResult = asNum(3.14);
  assert(isOk(floatResult));
  expect(floatResult.ok).toBe(3.14);

  const stringResult = asNum("123");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a number");

  const boolResult = asNum(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a number");

  const nullResult = asNum(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a number");
});
