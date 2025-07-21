import { test, expect, assert } from "vitest";
import {
  plgg,
  isOk,
  isErr,
  ok,
  hold,
  err,
  InvalidError,
  asStr,
  Result,
} from "plgg/index";

test("plgg composes sync and async functions with early error exit", async () => {
  // Example: Processing user input through validation pipeline
  const increment = (x: number) => x + 1;
  const validatePositive = (x: number): Result<number, InvalidError> =>
    x > 0 ? ok(x) : err(new InvalidError({ message: "Must be positive" }));
  const asyncDouble = (x: number): Promise<number> =>
    new Promise((resolve) => setTimeout(() => resolve(x * 2), 1));
  const formatResult = (x: number): string => `Result: ${x}`;

  const result = await plgg(
    5,
    increment,
    validatePositive,
    asyncDouble,
    formatResult,
  );

  assert(isOk(result));
  expect(result.ok).toBe("Result: 12");
});

test("plgg stops processing on first error", async () => {
  const increment = (x: number) => x + 1;
  const failValidation = (_: number) =>
    Promise.resolve(err(new InvalidError({ message: "Validation failed" })));
  const neverCalled = (_: number) => {
    throw new Error("This should never be called");
  };

  const result = await plgg(5, increment, failValidation, neverCalled);

  assert(isErr(result));
  expect(result.err.message).toBe("Validation failed");
});

test("plgg handles mixed return types (values, Results, Promises)", async () => {
  // Demonstrates real-world API processing pipeline
  const parseInput = (input: string) => input.trim();
  const validateNotEmpty = (str: string): Result<string, InvalidError> =>
    str.length > 0
      ? ok(str)
      : err(new InvalidError({ message: "Empty input" }));
  const fetchData = (id: string): Promise<{ id: string; value: number }> =>
    new Promise((resolve) => setTimeout(() => resolve({ id, value: 42 }), 1));
  const extractValue = (data: { id: string; value: number }) => data.value;

  const result = await plgg(
    "user123",
    parseInput,
    validateNotEmpty,
    fetchData,
    extractValue,
  );

  assert(isOk(result));
  expect(result.ok).toBe(42);
});

test("plgg with type casting and validation chain", async () => {
  // Example: Form validation pipeline
  const userData = { name: "John", age: "30" };

  const result = await plgg(
    userData,
    (data: any) => data.name,
    asStr,
    (name: string) => name.toUpperCase(),
    hold((name: string) => `Hello, ${name}!`),
  );

  assert(isOk(result));
  expect(result.ok).toBe("Hello, JOHN!");
});

test("plgg gracefully handles exceptions in functions", async () => {
  const throwError = (_: number) => {
    throw new Error("Unexpected error");
  };

  const result = await plgg(5, throwError);

  assert(isErr(result));
  expect(result.err.message).toContain("Unexpected error in plgg");
});

test("plgg handles thrown PlggError", async () => {
  const throwPlggError = (_: number) => {
    throw new InvalidError({ message: "Domain error thrown" });
  };

  const result = await plgg(5, throwPlggError);

  assert(isErr(result));
  expect(result.err.message).toBe("Domain error thrown");
});

test("plgg handles thrown non-Error values", async () => {
  const throwString = (_: number) => {
    throw "String error";
  };

  const result = await plgg(5, throwString);

  assert(isErr(result));
  expect(result.err.message).toBe("Unknown error in plgg");
});
