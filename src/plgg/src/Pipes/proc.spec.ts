import { test, expect, assert } from "vitest";
import {
  proc,
  isErr,
  fail,
  ok,
  ValidationError,
  Result,
  bind,
  tryCatch,
} from "plgg/index";

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
    bind((a) => a),
    failFn,
    tryCatch(
      (x: number) => x * 7,
      (error: unknown) => new ValidationError({ message: String(error) }),
    ),
    triple,
  );
  assert(isErr(result));
  expect(result.err.message).toBe("Test error");
});
