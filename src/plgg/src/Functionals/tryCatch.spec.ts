import { test, expect, assert } from "vitest";
import {
  InvalidError,
  tryCatch,
  isOk,
  isErr,
} from "plgg/index";

test("tryCatch wraps functions to handle exceptions", () => {
  // Example: Safe function execution
  const parseNumber = tryCatch(
    (input: string) => {
      const num = parseInt(input, 10);
      if (isNaN(num))
        throw new Error("Not a number");
      return num;
    },
    (error: unknown) =>
      new InvalidError({
        message: `Parse error: ${error}`,
      }),
  );

  const successResult = parseNumber("123");
  assert(isOk(successResult));
  expect(successResult.content).toBe(123);

  const errorResult = parseNumber("abc");
  assert(isErr(errorResult));
  expect(errorResult.content.message).toContain(
    "Parse error",
  );
});

test("tryCatch with default error handler", () => {
  // Test tryCatch without custom error handler
  const throwingFunction = (input: string) => {
    if (input === "error")
      throw new Error("Custom error");
    if (input === "string") throw "String error";
    return input.toUpperCase();
  };

  const safeThrowing = tryCatch(throwingFunction);

  const errorResult = safeThrowing("error");
  assert(isErr(errorResult));
  expect(errorResult.content.message).toBe(
    "Operation failed: Custom error",
  );

  const stringErrorResult =
    safeThrowing("string");
  assert(isErr(stringErrorResult));
  expect(stringErrorResult.content.message).toBe(
    "Unexpected error occurred",
  );
});
