import { test, expect, assert } from "vitest";
import {
  isErr,
  isOk,
  ValidationError,
  ok,
  err,
  Result,
  mapOk,
  mapErr,
  mapResult,
} from "plgg/index";

test("mapOk should transform success value", () => {
  const double = (x: number) => ok(x * 2);
  const result = mapOk(double)(ok(5));

  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapOk should pass through error", () => {
  const double = (x: number): Result<number, ValidationError> => ok(x * 2);
  const error = new ValidationError({ message: "test error" });
  const result = mapOk(double)(err(error));

  assert(isErr(result));
  expect(result.err).toBe(error);
});

test("mapErr should transform error value", () => {
  const handleError = (_: ValidationError) => ok("handled");
  const error = new ValidationError({ message: "test error" });
  const result = mapErr(handleError)(err(error));

  assert(isOk(result));
  expect(result.ok).toBe("handled");
});

test("mapErr should pass through success", () => {
  const handleError = (_: ValidationError) => ok("handled");
  const result = mapErr(handleError)(ok<string, ValidationError>("success"));

  assert(isOk(result));
  expect(result.ok).toBe("success");
});

test("mapResult should handle success case", async () => {
  const onOk = (x: number) => ok(x * 2);
  const onErr = (_: ValidationError) => ok(0);
  const result = mapResult(onOk, onErr)(ok(5));

  assert(isOk(result));
  expect(result.ok).toBe(10);
});
