import { test, expect, assert } from "vitest";
import {
  newSome,
  newNone,
  asNone,
  isOk,
  isErr,
  pipe,
} from "plgg/index";

test("asNone - safe casting to None type", () => {
  const noneValue = newNone();
  const result1 = pipe(noneValue, asNone);

  assert(isOk(result1));
  expect(result1.content).toBe(noneValue);

  // Test with non-None value
  const someValue = newSome(42);
  const result2 = pipe(someValue, asNone);

  assert(isErr(result2));
  expect(result2.content.message).toBe(
    "Value is not a None",
  );

  // Test with non-Option value
  const result3 = pipe(42, asNone);
  assert(isErr(result3));
  expect(result3.content.message).toBe(
    "Value is not a None",
  );

  // Test with null/undefined
  const result4 = pipe(null, asNone);
  assert(isErr(result4));
  expect(result4.content.message).toBe(
    "Value is not a None",
  );

  const result5 = pipe(undefined, asNone);
  assert(isErr(result5));
  expect(result5.content.message).toBe(
    "Value is not a None",
  );
});
