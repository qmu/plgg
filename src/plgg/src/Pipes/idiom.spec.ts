import { test, expect, assert } from "vitest";
import {
  lift,
  isErr,
  isOk,
  ValidationError,
  success,
  fail,
  ok,
  err,
  Result,
} from "plgg/index";
import {
  mapOkAsync,
  mapErrAsync,
  mapResultAsync,
  mapProcOk,
  mapProcErr,
  tap,
} from "plgg/Pipes/idiom";

test("mapOk should transform success value", async () => {
  const double = (x: number) => ok(x * 2);
  const result = await mapOkAsync(double)(ok(5));

  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapOk should pass through error", async () => {
  const double = (x: number): Result<number, ValidationError> => ok(x * 2);
  const error = new ValidationError({ message: "test error" });
  const result = await mapOkAsync(double)(err(error));

  assert(isErr(result));
  expect(result.err).toBe(error);
});

test("mapErr should transform error value", async () => {
  const handleError = (_: ValidationError) => ok("handled");
  const error = new ValidationError({ message: "test error" });
  const result = await mapErrAsync(handleError)(err(error));

  assert(isOk(result));
  expect(result.ok).toBe("handled");
});

test("mapErr should pass through success", async () => {
  const handleError = (_: ValidationError) => ok("handled");
  const result = await mapErrAsync(handleError)(
    ok<string, ValidationError>("success"),
  );

  assert(isOk(result));
  expect(result.ok).toBe("success");
});

test("mapResult should handle success case", async () => {
  const onOk = (x: number) => ok(x * 2);
  const onErr = (_: ValidationError) => ok(0);
  const result = await mapResultAsync(onOk, onErr)(ok(5));

  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapProcOk should transform success value", async () => {
  const double = (x: number) => success(x * 2);
  const result = await mapProcOk(double)(success(5));

  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapProcOk should pass through error", async () => {
  const double = (x: number) => success(x * 2);
  const error = new ValidationError({ message: "test error" });
  const result = await mapProcOk(double)(fail(error));

  assert(isErr(result));
  expect(result.err).toBe(error);
});

test("mapProcErr should transform error value", async () => {
  const handleError = (_: ValidationError) => success("handled");
  const error = new ValidationError({ message: "test error" });
  const result = await mapProcErr(handleError)(fail(error));

  assert(isOk(result));
  expect(result.ok).toBe("handled");
});

test("mapProcErr should pass through success", async () => {
  const handleError = (_: ValidationError) => success<string>("handled");
  const result = await mapProcErr(handleError)(success("test"));

  assert(isOk(result));
  expect(result.ok).toBe("test");
});

test("lift should create Procedural from sync function", async () => {
  const double = (x: number) => x * 2;
  const result = await lift(double)(5);

  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("tap should execute side effect on success and return original result", () => {
  let sideEffectValue: number | undefined;
  const tapFn = (value: Result<number, Error>) => {
    if (!isOk(value)) {
      throw new Error("Expected value to be ok");
    }
    sideEffectValue = value.ok * 10;
  };

  const result = tap(tapFn)(ok(5));

  assert(isOk(result));
  expect(result.ok).toBe(5);
  expect(sideEffectValue).toBe(50);
});

test("tap should execute side effect even on error and return original error", () => {
  let sideEffectExecuted = false;
  const tapFn = (_: Result<number, Error>) => {
    sideEffectExecuted = true;
  };
  const error = new ValidationError({ message: "test error" });
  const result = tap(tapFn)(err(error));

  assert(isErr(result));
  expect(result.err).toBe(error);
  expect(sideEffectExecuted).toBe(true);
});
