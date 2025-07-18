import { test, expect, assert } from "vitest";
import { isNum, asNum, isOk, isErr } from "plgg/index";

test("isNum correctly identifies numeric values", () => {
  // Valid numbers
  expect(isNum(123)).toBe(true);
  expect(isNum(0)).toBe(true);
  expect(isNum(-123)).toBe(true);
  expect(isNum(3.14)).toBe(true);
  expect(isNum(Number.MAX_SAFE_INTEGER)).toBe(true);
  expect(isNum(Number.MIN_SAFE_INTEGER)).toBe(true);
  expect(isNum(Infinity)).toBe(true);
  expect(isNum(-Infinity)).toBe(true);
  expect(isNum(NaN)).toBe(true);
  
  // BigInt values within safe range
  expect(isNum(BigInt(123))).toBe(true);
  expect(isNum(BigInt(Number.MAX_SAFE_INTEGER))).toBe(true);
  expect(isNum(BigInt(Number.MIN_SAFE_INTEGER))).toBe(true);
  
  // Invalid types
  expect(isNum("123")).toBe(false);
  expect(isNum(true)).toBe(false);
  expect(isNum(null)).toBe(false);
  expect(isNum(undefined)).toBe(false);
  expect(isNum({})).toBe(false);
  expect(isNum([])).toBe(false);
  expect(isNum(Symbol("test"))).toBe(false);
});

test("asNum validates and converts numeric values", () => {
  // Example: Age validation
  const validAge = asNum(25);
  assert(isOk(validAge));
  expect(validAge.ok).toBe(25);

  const zeroAge = asNum(0);
  assert(isOk(zeroAge));
  expect(zeroAge.ok).toBe(0);

  const negativeValue = asNum(-123);
  assert(isOk(negativeValue));
  expect(negativeValue.ok).toBe(-123);

  const floatValue = asNum(3.14);
  assert(isOk(floatValue));
  expect(floatValue.ok).toBe(3.14);

  // BigInt conversion
  const bigIntValue = asNum(BigInt(42));
  assert(isOk(bigIntValue));
  expect(bigIntValue.ok).toBe(42);

  // Example: API response validation
  const stringInput = asNum("123");
  assert(isErr(stringInput));
  expect(stringInput.err.message).toBe("Value is not a number");

  const booleanInput = asNum(true);
  assert(isErr(booleanInput));
  expect(booleanInput.err.message).toBe("Value is not a number");

  const nullInput = asNum(null);
  assert(isErr(nullInput));
  expect(nullInput.err.message).toBe("Value is not a number");
});

test("asNum works in validation pipelines", () => {
  // Example: Price validation with business rules
  const validatePrice = (input: unknown) => {
    const numResult = asNum(input);
    if (isErr(numResult)) return numResult;
    
    const price = numResult.ok;
    if (price < 0) {
      return { _tag: "Err" as const, err: new Error("Price cannot be negative") };
    }
    if (price > 10000) {
      return { _tag: "Err" as const, err: new Error("Price too high") };
    }
    return { _tag: "Ok" as const, ok: price };
  };

  const validPrice = validatePrice(29.99);
  assert(isOk(validPrice));
  expect(validPrice.ok).toBe(29.99);

  const invalidType = validatePrice("not-a-number");
  assert(isErr(invalidType));
  expect(invalidType.err.message).toBe("Value is not a number");

  const negativePrice = validatePrice(-5);
  assert(isErr(negativePrice));
  expect(negativePrice.err.message).toBe("Price cannot be negative");

  const expensivePrice = validatePrice(15000);
  assert(isErr(expensivePrice));
  expect(expensivePrice.err.message).toBe("Price too high");
});

test("asNum handles special numeric values", () => {
  // Example: Mathematical operations that might produce special values
  const infinityResult = asNum(Infinity);
  assert(isOk(infinityResult));
  expect(infinityResult.ok).toBe(Infinity);

  const negativeInfinityResult = asNum(-Infinity);
  assert(isOk(negativeInfinityResult));
  expect(negativeInfinityResult.ok).toBe(-Infinity);

  const nanResult = asNum(NaN);
  assert(isOk(nanResult));
  expect(Number.isNaN(nanResult.ok)).toBe(true);
});