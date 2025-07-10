import { test, expect, assert } from "vitest";
import { isNum, castNum, isOk, isErr } from "plgg/index";

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
  const validResult = castNum(123);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(123);

  const zeroResult = castNum(0);
  assert(isOk(zeroResult));
  expect(validResult.ok).toBe(123);

  const negativeResult = castNum(-123);
  assert(isOk(negativeResult));
  expect(negativeResult.ok).toBe(-123);

  const floatResult = castNum(3.14);
  assert(isOk(floatResult));
  expect(floatResult.ok).toBe(3.14);

  const stringResult = castNum("123");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a number");

  const boolResult = castNum(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a number");

  const nullResult = castNum(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a number");
});
