import { test, expect, assert } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  isResult,
  Result,
  mapOk,
  mapErr,
  mapResult,
  InvalidError,
} from "plgg/index";

test("ok creates Ok result", () => {
  const result = ok(42);
  expect(result._tag).toBe("Ok");
  assert(isOk(result));
  if (isOk(result)) {
    expect(result.ok).toBe(42);
  }
});

test("err creates Err result", () => {
  const result = err("error message");
  expect(result._tag).toBe("Err");
  assert(isErr(result));
  if (isErr(result)) {
    expect(result.err).toBe("error message");
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
    expect(stringResult.ok).toBe("hello");
  }

  if (isErr(numberErrorResult)) {
    expect(numberErrorResult.err).toBe(404);
  }
});

test("mapOk transforms success values while preserving errors", () => {
  // Example: Processing successful API responses
  const formatPrice = (price: number) =>
    ok<string, InvalidError>(`$${price.toFixed(2)}`);

  const successResult = mapOk(formatPrice)(ok<number, InvalidError>(29.99));
  assert(isOk(successResult));
  expect(successResult.ok).toBe("$29.99");

  const priceError = new InvalidError({ message: "Invalid price" });
  const errorResult = mapOk(formatPrice)(err<InvalidError, number>(priceError));
  assert(isErr(errorResult));
  expect(errorResult.err.message).toBe("Invalid price");
});

test("mapErr recovers from errors while preserving success values", () => {
  // Example: Error recovery in data processing
  const recoverFromError = (_: InvalidError) => ok("default-value");

  const errorResult = mapErr(recoverFromError)(
    err(new InvalidError({ message: "Parse failed" })),
  );
  assert(isOk(errorResult));
  expect(errorResult.ok).toBe("default-value");

  const successResult = mapErr(recoverFromError)(ok("original-value"));
  assert(isOk(successResult));
  expect(successResult.ok).toBe("original-value");
});

test("mapResult handles both success and error cases", () => {
  // Example: Converting results to consistent output format
  const formatSuccess = (data: string) => ok(`SUCCESS: ${data}`);
  const formatError = (error: InvalidError) => ok(`ERROR: ${error.message}`);

  const successResult = mapResult(formatSuccess, formatError)(ok("user-data"));
  assert(isOk(successResult));
  expect(successResult.ok).toBe("SUCCESS: user-data");

  const errorResult = mapResult(
    formatSuccess,
    formatError,
  )(err(new InvalidError({ message: "Not found" })));
  assert(isOk(errorResult));
  expect(errorResult.ok).toBe("ERROR: Not found");
});
