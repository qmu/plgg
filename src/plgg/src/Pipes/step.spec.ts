import { test, expect, assert } from "vitest";
import {
  step,
  isOk,
  isErr,
  ok,
  Result,
  bind,
  fail,
  ValidationError,
} from "plgg/index";

test("step with error in chain", async () => {
  const f1 = (x: number) => x + 1;
  const f2 = (x: number) => ok(x + 1);
  const f3 = (x: number): Promise<number> =>
    new Promise((resolve) => setTimeout(() => resolve(x + 1), 1));
  const f4 = (x: number): Promise<Result<number, Error>> =>
    new Promise((resolve) => setTimeout(() => resolve(ok(x + 1)), 1));
  const numToString = (x: number): string => String(x);
  const StringToNumber = (x: string): number => Number(x);
  const failFn = (_: number) =>
    fail<number>(new ValidationError({ message: "Test error" }));

  const result1 = await step(
    1,
    f1,
    f2,
    f3,
    f4,
    numToString,
    StringToNumber,
    bind((a) => a),
  );
  assert(isOk(result1));
  expect(result1).toEqual(ok(5));

  const result2 = await step(1, f1, failFn, f2, f3, f4);
  assert(isErr(result2));
  expect(result2.err.message).toBe("Test error");
});
