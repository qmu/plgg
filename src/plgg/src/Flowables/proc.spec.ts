import { test, expect, assert } from "vitest";
import {
  InvalidError,
  Result,
  proc,
  isOk,
  isErr,
  newOk,
  hold,
  newErr,
  asStr,
} from "plgg/index";

test("proc composes sync and async functions with early error exit", async () => {
  // Example: Processing user input through validation pipeline
  const increment = (x: number) => x + 1;
  const validatePositive = (
    x: number,
  ): Result<number, InvalidError> =>
    x > 0
      ? newOk(x)
      : newErr(
          new InvalidError({
            message: "Must be positive",
          }),
        );
  const asyncDouble = (
    x: number,
  ): Promise<number> =>
    new Promise((resolve) =>
      setTimeout(() => resolve(x * 2), 1),
    );
  const formatResult = (x: number): string =>
    `Result: ${x}`;

  const result = await proc(
    5,
    increment,
    validatePositive,
    asyncDouble,
    formatResult,
  );

  assert(isOk(result));
  expect(result.content).toBe("Result: 12");
});

test("proc stops processing on first error", async () => {
  const increment = (x: number) => x + 1;
  const failValidation = (
    _: number,
  ): Promise<Result<number, InvalidError>> =>
    Promise.resolve(
      newErr(
        new InvalidError({
          message: "Validation failed",
        }),
      ),
    );
  const neverCalled = (_: never): string =>
    "should not be called";

  const result = await proc(
    5,
    increment,
    failValidation as any,
    neverCalled as any,
  );

  assert(isErr(result));
  expect(result.content.message).toBe(
    "Validation failed",
  );
});

test("proc handles mixed return types (values, Results, Promises)", async () => {
  // Demonstrates real-world API processing pipeline
  const parseInput = (input: string) =>
    input.trim();
  const validateNotEmpty = (
    str: string,
  ): Result<string, InvalidError> =>
    str.length > 0
      ? newOk(str)
      : newErr(
          new InvalidError({
            message: "Empty input",
          }),
        );
  const fetchData = (
    id: string,
  ): Promise<{ id: string; value: number }> =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ id, value: 42 }),
        1,
      ),
    );
  const extractValue = (data: {
    id: string;
    value: number;
  }) => data.value;

  const result = await proc(
    "user123",
    parseInput,
    validateNotEmpty,
    fetchData,
    extractValue,
  );

  assert(isOk(result));
  expect(result.content).toBe(42);
});

test("proc with type casting and validation chain", async () => {
  // Example: Form validation pipeline
  const userData = { name: "John", age: "30" };

  const result = await proc(
    userData,
    (data: any) => data.name,
    asStr,
    (name: string) => name.toUpperCase(),
    hold((name: string) => `Hello, ${name}!`),
  );

  assert(isOk(result));
  expect(result.content).toBe("Hello, JOHN!");
});

test("proc gracefully handles exceptions in functions", async () => {
  const processWithError = (
    x: number,
  ): Result<string, InvalidError> => {
    if (x === 5) {
      throw new Error("Unexpected error");
    }
    return newOk(`Processed: ${x}`);
  };

  const result = await proc<number, string>(
    5,
    processWithError,
  );

  assert(isErr(result));
  expect(result.content.message).toContain(
    "Unexpected error in proc",
  );
});

test("proc handles thrown procError", async () => {
  const processWithprocError = (
    x: number,
  ): Result<string, InvalidError> => {
    if (x === 5) {
      throw new InvalidError({
        message: "Domain error thrown",
      });
    }
    return newOk(`Processed: ${x}`);
  };

  const result = await proc<number, string>(
    5,
    processWithprocError,
  );

  assert(isErr(result));
  expect(result.content.message).toBe(
    "Domain error thrown",
  );
});

test("proc handles thrown non-Error values", async () => {
  const processWithStringError = (
    x: number,
  ): Result<string, InvalidError> => {
    if (x === 5) {
      throw "String error";
    }
    return newOk(`Processed: ${x}`);
  };

  const result = await proc<number, string>(
    5,
    processWithStringError,
  );

  assert(isErr(result));
  expect(result.content.message).toBe(
    "Unknown error in proc",
  );
});
