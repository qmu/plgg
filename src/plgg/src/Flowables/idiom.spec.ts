import { test, expect, assert, vi } from "vitest";
import {
  InvalidError,
  Result,
  isErr,
  isOk,
  pass,
  hold,
  debug,
  refine,
  defined,
  tryCatch,
  jsonEncode,
  jsonDecode,
  conclude,
  pipe,
  newOk,
  newErr,
} from "plgg/index";

test("pass returns its argument unchanged (identity function)", () => {
  // Test with different types
  expect(pass(42)).toBe(42);
  expect(pass("hello")).toBe("hello");
  expect(pass(true)).toBe(true);
  expect(pass(false)).toBe(false);
  expect(pass(null)).toBe(null);
  expect(pass(undefined)).toBe(undefined);

  // Test with objects (should return same reference)
  const obj = { foo: "bar" };
  expect(pass(obj)).toBe(obj);

  // Test with arrays (should return same reference)
  const arr = [1, 2, 3];
  expect(pass(arr)).toBe(arr);

  // Test with functions
  const fn = () => "test";
  expect(pass(fn)).toBe(fn);
});

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

test("conclude - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    return isNaN(num)
      ? newErr(new Error("Invalid number"))
      : newOk(num);
  };

  const r1 = pipe([], conclude(parseNumber));
  assert(isOk(r1));
  expect(r1.content).toEqual([]);

  const r2 = pipe(
    ["1", "2", "3"],
    conclude(parseNumber),
  );
  assert(isOk(r2));
  expect(r2.content).toEqual([1, 2, 3]);

  const r3 = pipe(
    ["42", "3.14", "0"],
    conclude(parseNumber),
  );
  assert(isOk(r3));
  expect(r3.content).toEqual([42, 3.14, 0]);
});

test("conclude - failure case with first error returned", () => {
  const parsePositiveNumber = (
    s: string,
  ): Result<number, Error> => {
    const num = Number(s);
    if (isNaN(num)) {
      return newErr(
        new Error("Invalid number: " + s),
      );
    }
    if (num <= 0) {
      return newErr(
        new Error("Non-positive number: " + s),
      );
    }
    return newOk(num);
  };

  const r1 = pipe(
    ["invalid"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r1));
  expect(r1.content.length).toBe(1);
  expect(r1.content[0]?.message).toBe(
    "Invalid number: invalid",
  );

  const r2 = pipe(
    ["1", "invalid", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r2));
  expect(r2.content.length).toBe(1);
  expect(r2.content[0]?.message).toBe(
    "Invalid number: invalid",
  );

  const r3 = pipe(
    ["1", "-5", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r3));
  expect(r3.content.length).toBe(1);
  expect(r3.content[0]?.message).toBe(
    "Non-positive number: -5",
  );

  const r4 = pipe(
    ["-1", "invalid", "0"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r4));
  expect(r4.content.length).toBe(3);
  expect(r4.content[0]?.message).toBe(
    "Non-positive number: -1",
  );
  expect(r4.content[1]?.message).toBe(
    "Invalid number: invalid",
  );
  expect(r4.content[2]?.message).toBe(
    "Non-positive number: 0",
  );
});

test("conclude - mixed types transformation", () => {
  const processValue = (
    x: number,
  ): Result<string, Error> => {
    if (x < 0) {
      return newErr(
        new Error("Negative value not allowed"),
      );
    }
    if (x === 0) {
      return newOk("zero");
    }
    if (x === 1) {
      return newOk("one");
    }
    return newOk(`number: ${x}`);
  };

  const r1 = pipe(
    [0, 1, 2, 10],
    conclude(processValue),
  );
  assert(isOk(r1));
  expect(r1.content).toEqual([
    "zero",
    "one",
    "number: 2",
    "number: 10",
  ]);

  const r2 = pipe(
    [1, -1, 2],
    conclude(processValue),
  );
  assert(isErr(r2));
  expect(r2.content.length).toBe(1);
  expect(r2.content[0]?.message).toBe(
    "Negative value not allowed",
  );
});

test("conclude - processes all elements but returns first error", () => {
  let callCount = 0;
  const trackingFunction = (
    x: number,
  ): Result<number, Error> => {
    callCount++;
    if (x === 2) {
      return newErr(new Error("Error at 2"));
    }
    return newOk(x * 10);
  };

  callCount = 0;
  const r1 = pipe(
    [1, 2, 3, 4],
    conclude(trackingFunction),
  );
  assert(isErr(r1));
  expect(r1.content.length).toBe(1);
  expect(r1.content[0]?.message).toBe(
    "Error at 2",
  );
  expect(callCount).toBe(4);

  callCount = 0;
  const r2 = pipe(
    [1, 3, 4],
    conclude(trackingFunction),
  );
  assert(isOk(r2));
  expect(r2.content).toEqual([10, 30, 40]);
  expect(callCount).toBe(3);
});
