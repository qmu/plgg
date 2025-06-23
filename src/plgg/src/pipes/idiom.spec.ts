import { test, expect, assert } from "vitest";
import { lift, proc, isErr, isOk, handle, ValidationError, success, fail, ok, err, Result } from "plgg/index";
import * as idiom from "plgg/pipes/idiom";

test("mapOk should transform success value", async () => {
  const double = (x: number) => ok(x * 2);
  const result = await idiom.mapOk(double)(ok(5));
  
  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapOk should pass through error", async () => {
  const double = (x: number): Result<number, ValidationError> => ok(x * 2);
  const error = new ValidationError("test error");
  const result = await idiom.mapOk(double)(err(error));
  
  assert(isErr(result));
  expect(result.err).toBe(error);
});

test("mapErr should transform error value", async () => {
  const handleError = (_: ValidationError) => ok("handled");
  const error = new ValidationError("test error");
  const result = await idiom.mapErr(handleError)(err(error));
  
  assert(isOk(result));
  expect(result.ok).toBe("handled");
});

test("mapErr should pass through success", async () => {
  const handleError = (_: ValidationError) => ok("handled");
  const result = await idiom.mapErr(handleError)(ok<string, ValidationError>("success"));
  
  assert(isOk(result));
  expect(result.ok).toBe("success");
});

test("mapResult should handle success case", async () => {
  const onOk = (x: number) => ok(x * 2);
  const onErr = (_: ValidationError) => ok(0);
  const result = await idiom.mapResult(onOk, onErr)(ok(5));
  
  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapResult should handle error case", async () => {
  const onOk = (x: number) => ok(x * 2);
  const onErr = (_: ValidationError) => ok(-1);
  const error = new ValidationError("test error");
  const result = await idiom.mapResult(onOk, onErr)(err(error));
  
  assert(isOk(result));
  expect(result.ok).toBe(-1);
});

test("mapProcOk should transform success value", async () => {
  const double = (x: number) => success(x * 2);
  const result = await idiom.mapProcOk(double)(success(5));
  
  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("mapProcOk should pass through error", async () => {
  const double = (x: number) => success(x * 2);
  const error = new ValidationError("test error");
  const result = await idiom.mapProcOk(double)(fail(error));
  
  assert(isErr(result));
  expect(result.err).toBe(error);
});

test("mapProcErr should transform error value", async () => {
  const handleError = (_: ValidationError) => success("handled");
  const error = new ValidationError("test error");
  const result = await idiom.mapProcErr(handleError)(fail(error));
  
  assert(isOk(result));
  expect(result.ok).toBe("handled");
});

test("mapProcErr should pass through success", async () => {
  const handleError = (_: ValidationError) => success("handled");
  const result = await idiom.mapProcErr(handleError)(success("test"));
  
  assert(isOk(result));
  expect(result.ok).toBe("test");
});

test("capture should transform error type", async () => {
  const transformError = (e: ValidationError) => new ValidationError("captured: " + e.message);
  const error = new ValidationError("original error");
  const result = await idiom.capture(transformError)(fail(error));
  
  assert(isErr(result));
  expect(result.err.message).toBe("captured: original error");
});

test("capture should pass through success", async () => {
  const transformError = (e: ValidationError) => new ValidationError("captured: " + e.message);
  const result = await idiom.capture(transformError)(success(42));
  
  assert(isOk(result));
  expect(result.ok).toBe(42);
});

test("lift should create Procedural from sync function", async () => {
  const double = (x: number) => x * 2;
  const result = await idiom.lift(double)(5);
  
  assert(isOk(result));
  expect(result.ok).toBe(10);
});

test("handle should transform error", async () => {
  const originalError = new ValidationError("original");
  const errorProc = fail(originalError);

  const result = await handle(
    errorProc,
    (er) => new ValidationError("Error occurred", er),
  );

  assert(isErr(result));
  expect(result.err.message).toBe("Error occurred");
});

test("handle should pass through success", async () => {
  const result = await handle(
    proc(5, lift((x: number) => x * 2)),
    (er) => new ValidationError("Error occurred", er),
  );

  if (isErr(result)) {
    assert.fail("Expected success, but got error");
  }
  expect(result.ok).toBe(10);
});
