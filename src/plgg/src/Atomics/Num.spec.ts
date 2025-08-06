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
  expect(validAge.content).toBe(25);

  const zeroAge = asNum(0);
  assert(isOk(zeroAge));
  expect(zeroAge.content).toBe(0);

  const negativeValue = asNum(-123);
  assert(isOk(negativeValue));
  expect(negativeValue.content).toBe(-123);

  const floatValue = asNum(3.14);
  assert(isOk(floatValue));
  expect(floatValue.content).toBe(3.14);

  // BigInt conversion
  const bigIntValue = asNum(BigInt(42));
  assert(isOk(bigIntValue));
  expect(bigIntValue.content).toBe(42);

  // Example: API response validation
  const stringInput = asNum("123");
  assert(isErr(stringInput));
  expect(stringInput.content.message).toBe("Value is not a number");

  const booleanInput = asNum(true);
  assert(isErr(booleanInput));
  expect(booleanInput.content.message).toBe("Value is not a number");

  const nullInput = asNum(null);
  assert(isErr(nullInput));
  expect(nullInput.content.message).toBe("Value is not a number");
});

test("asNum works in validation pipelines", () => {
  // Example: Price validation with business rules
  const validatePrice = (input: unknown) => {
    const numResult = asNum(input);
    if (isErr(numResult)) return numResult;
    
    const price = numResult.content;
    if (price < 0) {
      return { __tag: "Err" as const, content: new Error("Price cannot be negative") };
    }
    if (price > 10000) {
      return { __tag: "Err" as const, content: new Error("Price too high") };
    }
    return { __tag: "Ok" as const, content: price };
  };

  const validPrice = validatePrice(29.99);
  assert(isOk(validPrice));
  expect(validPrice.content).toBe(29.99);

  const invalidType = validatePrice("not-a-number");
  assert(isErr(invalidType));
  expect(invalidType.content.message).toBe("Value is not a number");

  const negativePrice = validatePrice(-5);
  assert(isErr(negativePrice));
  expect(negativePrice.content.message).toBe("Price cannot be negative");

  const expensivePrice = validatePrice(15000);
  assert(isErr(expensivePrice));
  expect(expensivePrice.content.message).toBe("Price too high");
});

test("asNum handles special numeric values", () => {
  // Example: Mathematical operations that might produce special values
  const infinityResult = asNum(Infinity);
  assert(isOk(infinityResult));
  expect(infinityResult.content).toBe(Infinity);

  const negativeInfinityResult = asNum(-Infinity);
  assert(isOk(negativeInfinityResult));
  expect(negativeInfinityResult.content).toBe(-Infinity);

  const nanResult = asNum(NaN);
  assert(isOk(nanResult));
  expect(Number.isNaN(nanResult.content)).toBe(true);
});