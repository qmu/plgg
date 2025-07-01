import { test, expect, assert } from "vitest";
import { Num } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";

test("Num.is type guard", () => {
  expect(Num.is(123)).toBe(true);
  expect(Num.is(0)).toBe(true);
  expect(Num.is(-123)).toBe(true);
  expect(Num.is(3.14)).toBe(true);
  expect(Num.is(Infinity)).toBe(true);
  expect(Num.is(-Infinity)).toBe(true);
  expect(Num.is(NaN)).toBe(true);
  expect(Num.is("123")).toBe(false);
  expect(Num.is(true)).toBe(false);
  expect(Num.is(null)).toBe(false);
  expect(Num.is(undefined)).toBe(false);
  expect(Num.is({})).toBe(false);
  expect(Num.is([])).toBe(false);
});

test("Num.cast validation", async () => {
  const validResult = Num.cast(123);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(123);

  const zeroResult = Num.cast(0);
  assert(isOk(zeroResult));
  expect(validResult.ok).toBe(123);

  const negativeResult = Num.cast(-123);
  assert(isOk(negativeResult));
  expect(negativeResult.ok).toBe(-123);

  const floatResult = Num.cast(3.14);
  assert(isOk(floatResult));
  expect(floatResult.ok).toBe(3.14);

  const stringResult = Num.cast("123");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a number");

  const boolResult = Num.cast(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a number");

  const nullResult = Num.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a number");
});

test("Num.gt validation", async () => {
  const gt10 = Num.gt(10);

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
  const lt10 = Num.lt(10);

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

