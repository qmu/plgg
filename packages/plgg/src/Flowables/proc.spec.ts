import { test, expect, assert } from "vitest";
import {
  InvalidError,
  invalidError,
  SerializeError,
  Defect,
  Result,
  proc,
  isOk,
  isErr,
  ok,
  hold,
  err,
  asSoftStr,
  isPlggError,
} from "plgg/index";

/**
 * Type-level equality (order-insensitive for unions). `Expect<Equal<…>>` is a
 * compile error unless the two types match exactly — checked by `tsc --noEmit`,
 * not at runtime.
 */
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <
    T,
  >() => T extends Y ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

test("proc infers the PRECISE per-step error union, not unknown", () => {
  const validatePositive = (
    x: number,
  ): Result<number, InvalidError> =>
    x > 0
      ? ok(x)
      : err(invalidError({ message: "neg" }));
  const ser = (
    x: number,
  ): Result<string, SerializeError> =>
    ok(`${x}`);

  const run = () =>
    proc(5, validatePositive, ser);
  type Got = Awaited<ReturnType<typeof run>>;
  type Want = Result<
    string,
    InvalidError | SerializeError | Defect
  >;
  // Fails tsc if proc's error channel ever collapses back to `unknown`.
  type _Locked = Expect<Equal<Got, Want>>;
  const locked: _Locked = true;
  expect(locked).toBe(true);
});

test("proc composes sync and async functions with early error exit", async () => {
  // Example: Processing user input through validation pipeline
  const increment = (x: number) => x + 1;
  const validatePositive = (
    x: number,
  ): Result<number, InvalidError> =>
    x > 0
      ? ok(x)
      : err(
          invalidError({
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
      err(
        invalidError({
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
  assert(isPlggError(result.content));
  expect(result.content.content.message).toBe(
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
      ? ok(str)
      : err(
          invalidError({
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
    asSoftStr,
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
    return ok(`Processed: ${x}`);
  };

  const result = await proc(
    5,
    processWithError,
  );

  assert(isErr(result));
  assert(isPlggError(result.content));
  expect(result.content.content.message).toContain(
    "Unhandled throw in proc",
  );
});

test("proc handles thrown procError", async () => {
  const processWithprocError = (
    x: number,
  ): Result<string, InvalidError> => {
    if (x === 5) {
      throw invalidError({
        message: "Domain error thrown",
      });
    }
    return ok(`Processed: ${x}`);
  };

  const result = await proc(
    5,
    processWithprocError,
  );

  assert(isErr(result));
  assert(isPlggError(result.content));
  expect(result.content.content.message).toBe(
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
    return ok(`Processed: ${x}`);
  };

  const result = await proc(
    5,
    processWithStringError,
  );

  assert(isErr(result));
  assert(isPlggError(result.content));
  expect(result.content.content.message).toBe(
    "Unhandled throw in proc",
  );
});

test("proc unwraps initial Result value at runtime", async () => {
  // When initial value is already a Result, it should be unwrapped
  const initialResult = ok("hello");
  const toUpper = (s: string) => s.toUpperCase();

  const result = await proc(initialResult, toUpper);

  assert(isOk(result));
  expect(result.content).toBe("HELLO");
});

test("proc short-circuits on initial Err value", async () => {
  // When initial value is an Err, it should short-circuit
  const initialErr = err(
    invalidError({ message: "Initial error" }),
  );
  const neverCalled = (_: string) => "should not run";

  const result = await proc(initialErr, neverCalled);

  assert(isErr(result));
  assert(isPlggError(result.content));
  expect(result.content.content.message).toBe("Initial error");
});
