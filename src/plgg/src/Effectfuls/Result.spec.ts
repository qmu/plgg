import { test, expect, assert } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  isResult,
  Result,
  InvalidError,
  chainResult,
  mapResult,
  applyResult,
  ofResult,
} from "plgg/index";

test("ok creates Ok result", () => {
  const result = ok(42);
  expect(result.__tag).toBe("Ok");
  assert(isOk(result));
  if (isOk(result)) {
    expect(result.content).toBe(42);
  }
});

test("err creates Err result", () => {
  const result = err("error message");
  expect(result.__tag).toBe("Err");
  assert(isErr(result));
  if (isErr(result)) {
    expect(result.content).toBe("error message");
  }
});

test("isOk identifies Ok results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(isOk(okResult));
  assert(!isOk(errResult));
});

test("isErr identifies Err results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(!isErr(okResult));
  assert(isErr(errResult));
});

test("isResult identifies Result types", () => {
  const okResult = ok(123);
  const errResult = err("error");
  const notResult = { random: "object" };
  const nullValue = null;
  const undefinedValue = undefined;

  assert(isResult(okResult));
  assert(isResult(errResult));
  assert(!isResult(notResult));
  assert(!isResult(nullValue));
  assert(!isResult(undefinedValue));
});

test("Result can handle different types", () => {
  const stringResult: Result<string, number> = ok("hello");
  const numberErrorResult: Result<string, number> = err(404);

  assert(isOk(stringResult));
  assert(isErr(numberErrorResult));

  if (isOk(stringResult)) {
    expect(stringResult.content).toBe("hello");
  }

  if (isErr(numberErrorResult)) {
    expect(numberErrorResult.content).toBe(404);
  }
});

test("mapOk transforms success values while preserving errors", () => {
  // Example: Processing successful API responses
  const formatPrice = (price: number): Result<string, Error> =>
    ok(`$${price.toFixed(2)}`);

  const successResult = chainResult(formatPrice)(ok(29.99));
  assert(isOk(successResult));
  expect(successResult.content).toBe("$29.99");

  const priceError = new InvalidError({ message: "Invalid price" });
  const e = err(priceError);
  const errorResult = chainResult(formatPrice)(e);
  assert(isErr(errorResult));
  expect(errorResult.content.message).toBe("Invalid price");
});

test("mapResult transforms Ok values while preserving Err", () => {
  const double = (x: number) => x * 2;
  const okValue = ok(5);
  const errValue = err("error");

  const mappedOk = mapResult(double)(okValue);
  const mappedErr = mapResult(double)(errValue);

  assert(isOk(mappedOk));
  expect(mappedOk.content).toBe(10);

  assert(isErr(mappedErr));
  expect(mappedErr.content).toBe("error");
});

test("applyResult applies wrapped function to wrapped value", () => {
  const add = (x: number) => (y: number) => x + y;
  const okAdd3: Result<(y: number) => number, string> = ok(add(3));
  const okNumber: Result<number, string> = ok(5);
  const errFunction: Result<(y: number) => number, string> = err("function error");
  const errValue: Result<number, string> = err("value error");

  // Ok function applied to Ok value
  const result1 = applyResult(okAdd3)(okNumber);
  assert(isOk(result1));
  expect(result1.content).toBe(8);

  // Err function applied to Ok value
  const result2 = applyResult(errFunction)(okNumber);
  assert(isErr(result2));
  expect(result2.content).toBe("function error");

  // Ok function applied to Err value
  const result3 = applyResult<number, number, string>(okAdd3)(errValue);
  assert(isErr(result3));
  expect(result3.content).toBe("value error");

  // Err function applied to Err value
  const result4 = applyResult(errFunction)(errValue);
  assert(isErr(result4));
  expect(result4.content).toBe("function error");
});

test("ofResult creates Ok with value", () => {
  const result1 = ofResult(42);
  const result2 = ofResult("hello");
  const result3 = ofResult(null);

  assert(isOk(result1));
  expect(result1.content).toBe(42);

  assert(isOk(result2));
  expect(result2.content).toBe("hello");

  assert(isOk(result3));
  expect(result3.content).toBe(null);
});
