import { test, expect, assert } from "plgg-test";
import {
  invalidError,
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
      invalidError({
        message: `Parse error: ${error}`,
      }),
  );

  const successResult = parseNumber("123");
  assert(isOk(successResult));
  expect(successResult.content).toBe(123);

  const errorResult = parseNumber("abc");
  assert(isErr(errorResult));
  expect(errorResult.content.content.message).toContain(
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
  // default handler now yields a Defect (message + original in cause)
  expect(
    errorResult.content.content.message,
  ).toBe("Operation failed");

  const stringErrorResult =
    safeThrowing("string");
  assert(isErr(stringErrorResult));
  expect(
    stringErrorResult.content.content.message,
  ).toBe("Operation failed");
});

test("tryCatch wraps async resolved promise in Ok", async () => {
  const loader = tryCatch(
    async (key: string) => `value-for-${key}`,
  );
  const result = await loader("a");
  assert(isOk(result));
  expect(result.content).toBe("value-for-a");
});

test("tryCatch wraps async rejected promise in Err", async () => {
  const loader = tryCatch(
    async (_key: string) => {
      throw new Error("async failure");
    },
    (error: unknown) =>
      invalidError({
        message: `async: ${(error as Error).message}`,
      }),
  );
  const result = await loader("a");
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "async failure",
  );
});

test("tryCatch async uses default error handler", async () => {
  const loader = tryCatch(async (_: string) => {
    throw new Error("boom");
  });
  const result = await loader("x");
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Operation failed",
  );
});
