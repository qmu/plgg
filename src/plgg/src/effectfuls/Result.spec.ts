import { test, expect, assert } from "vitest";
import { ok, err, isOk, isErr, isResult, Result } from "plgg/index";

test("ok creates Ok result", () => {
  const result = ok(42);
  expect(result._tag).toBe("Ok");
  assert(isOk(result));
  if (isOk(result)) {
    expect(result.ok).toBe(42);
  }
});

test("err creates Err result", () => {
  const result = err("error message");
  expect(result._tag).toBe("Err");
  assert(isErr(result));
  if (isErr(result)) {
    expect(result.err).toBe("error message");
  }
});

test("isOk identifies Ok results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(isOk(okResult));
  assert(!isOk(errResult));
});

test("isErr identifies Err results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(!isErr(okResult));
  assert(isErr(errResult));
});

test("isResult identifies Result types", () => {
  const okResult = ok(123);
  const errResult = err("error");
  const notResult = { random: "object" };
  const nullValue = null;
  const undefinedValue = undefined;

  assert(isResult(okResult));
  assert(isResult(errResult));
  assert(!isResult(notResult));
  assert(!isResult(nullValue));
  assert(!isResult(undefinedValue));
});

test("Result can handle different types", () => {
  const stringResult: Result<string, number> = ok("hello");
  const numberErrorResult: Result<string, number> = err(404);

  assert(isOk(stringResult));
  assert(isErr(numberErrorResult));

  if (isOk(stringResult)) {
    expect(stringResult.ok).toBe("hello");
  }

  if (isErr(numberErrorResult)) {
    expect(numberErrorResult.err).toBe(404);
  }
});
