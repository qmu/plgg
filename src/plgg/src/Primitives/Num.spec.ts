import { test, expect, assert } from "vitest";
import { isNum, gt, lt, castNum, isOk, isErr } from "plgg/index";

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

test("Num.gt validation", async () => {
  const gt10 = gt(10);

  const validResult = gt10(15);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(15);

  const equalResult = gt10(10);
  assert(isErr(equalResult));
  expect(equalResult.err.message).toBe("The number 10 is not greater than 10");

  const lesserResult = gt10(5);
  assert(isErr(lesserResult));
  expect(lesserResult.err.message).toBe("The number 5 is not greater than 10");

  const negativeValidResult = gt10(11);
  assert(isOk(negativeValidResult));
  expect(negativeValidResult.ok).toBe(11);
});

test("Num.lt validation", async () => {
  const lt10 = lt(10);

  const validResult = lt10(5);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(5);

  const negativeResult = lt10(-5);
  assert(isOk(negativeResult));
  expect(negativeResult.ok).toBe(-5);

  const equalResult = lt10(10);
  assert(isErr(equalResult));
  expect(equalResult.err.message).toBe("The number 10 is not less than 10");

  const greaterResult = lt10(15);
  assert(isErr(greaterResult));
  expect(greaterResult.err.message).toBe("The number 15 is not less than 10");
});
