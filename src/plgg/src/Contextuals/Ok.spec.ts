import { test, expect, assert } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  asOk,
  pipe,
} from "plgg/index";

test("asOk - safe casting to Ok type", () => {
  const okValue = ok(42);
  const result1 = pipe(okValue, asOk);

  assert(isOk(result1));
  expect(result1.content).toBe(okValue);

  // Test with non-Ok value
  const errValue = err("error");
  const result2 = pipe(errValue, asOk);

  assert(isErr(result2));
  expect(result2.content.message).toBe(
    "Value is not an Ok",
  );

  // Test with non-Result value
  const result3 = pipe(42, asOk);
  assert(isErr(result3));
  expect(result3.content.message).toBe(
    "Value is not an Ok",
  );

  // Test with null/undefined
  const result4 = pipe(null, asOk);
  assert(isErr(result4));
  expect(result4.content.message).toBe(
    "Value is not an Ok",
  );

  const result5 = pipe(undefined, asOk);
  assert(isErr(result5));
  expect(result5.content.message).toBe(
    "Value is not an Ok",
  );
});
