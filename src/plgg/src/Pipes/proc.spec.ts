import { test, expect, assert } from "vitest";
import { lift, proc, isErr, isOk, fail, ValidationError } from "plgg/index";

test("proc with single function", async () => {
  const double = (x: number) => x * 2;

  const result = await proc(5, lift(double));
  if (isErr(result)) {
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

  const result = await proc(5, lift(double), failFn, lift(triple));
  assert(isErr(result));
  expect(result.err.message).toBe("Test error");
});
