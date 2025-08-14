import { test, expect, assert, vi } from "vitest";
import {
  isErr,
  isOk,
  InvalidError,
  hold,
  debug,
  refine,
  defined,
  tryCatch,
  jsonEncode,
  jsonDecode,
} from "plgg/index";

test("bind applies function to values in pipelines", () => {
  // Example: Simple value transformation in composition
  const uppercase = (s: string) =>
    s.toUpperCase();

  const result = hold(uppercase)("hello");
  expect(result).toBe("HELLO");
});

test("debug logs values without changing them", () => {
  // Example: Debugging values in processing pipeline
  const consoleSpy = vi
    .spyOn(console, "debug")
    .mockImplementation(() => {});

  const result = debug("test-value");
  expect(result).toBe("test-value");
  expect(consoleSpy).toHaveBeenCalledWith(
    "test-value",
  );

  consoleSpy.mockRestore();
});

test("refine validates values with custom predicates", () => {
  // Example: Custom validation rules
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(
    isPositive,
    "Number must be positive",
  );

  const validResult = validatePositive(5);
  assert(isOk(validResult));
  expect(validResult.content).toBe(5);

  const invalidResult = validatePositive(-3);
  assert(isErr(invalidResult));
  expect(invalidResult.content.message).toBe(
    "Number must be positive",
  );
});

test("defined checks for non-undefined values", () => {
  // Example: Handling optional values
  const validValue = defined("hello");
  assert(isOk(validValue));
  expect(validValue.content).toBe("hello");

  const undefinedValue = defined(undefined);
  assert(isErr(undefinedValue));
  expect(undefinedValue.content.message).toBe(
    "Value is undefined",
  );
});

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

test("jsonEncode and jsonDecode handle JSON operations", () => {
  // Example: JSON serialization/deserialization
  const data = { name: "John", age: 30 };

  const encoded = jsonEncode(data);
  expect(encoded).toBe(
    '{\n  "name": "John",\n  "age": 30\n}',
  );

  const decoded = jsonDecode(encoded);
  assert(isOk(decoded));
  expect(decoded.content).toEqual(data);

  const invalidJson = jsonDecode("invalid json");
  assert(isErr(invalidJson));
});

test("refine with default error message", () => {
  // Test refine function without custom error message
  const isPositive = (n: number) => n > 0;
  const validatePositive = refine(isPositive);

  const invalidResult = validatePositive(-5);
  assert(isErr(invalidResult));
  expect(invalidResult.content.message).toBe(
    "The value -5 is not valid according to the predicate",
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
