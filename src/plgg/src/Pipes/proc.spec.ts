import { test, expect, assert } from "vitest";
import {
  isResult,
  lift,
  proc,
  isErr,
  isOk,
  fail,
  ok,
  ValidationError,
  Result,
} from "plgg/index";

test("proc with single function", async () => {
  const double = (x: number) => x * 2;

  const result = await proc(5, lift(double));
  if (!isResult(result) || isErr(result)) {
    assert.fail("Expected success, but got error");
  }
  expect(result.ok).toBe(10);
});

test("proc with multiple functions", async () => {
  const double = (x: number) => x * 2;
  const triple = (x: number) => x * 3;

  const result = await proc(5, lift(double), lift(triple));
  assert(isOk(result));
  expect(result.ok).toBe(30);
});

test("proc with error in chain", async () => {
  const double = (x: number) => x * 2;
  const failFn = (_: number) =>
    fail<number>(new ValidationError({ message: "Test error" }));
  const triple = (x: number) => x * 3;
  const asyncFn = (x: number): Promise<number> =>
    new Promise((resolve) => setTimeout(() => resolve(x * 4), 100));
  const resultFn = (x: number) => ok(x * 5);
  const asyncResultFn = async (x: number): Promise<Result<number, never>> =>
    new Promise((resolve) => setTimeout(() => resolve(ok(x * 6)), 100));

  const result = await proc(
    5,
    double,
    asyncFn,
    resultFn,
    asyncResultFn,
    failFn,
    triple,
  );
  assert(isErr(result));
  expect(result.err.message).toBe("Test error");
});
