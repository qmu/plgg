import { test, expect, assert } from "vitest";
import {
  some,
  none,
  asSome,
  isOk,
  isErr,
  pipe,
} from "plgg/index";

test("asSome - safe casting to Some type", () => {
  const someValue = some(42);
  const result1 = pipe(someValue, asSome);

  assert(isOk(result1));
  expect(result1.content).toBe(someValue);

  // Test with non-Some value
  const noneValue = none();
  const result2 = pipe(noneValue, asSome);

  assert(isErr(result2));
  expect(result2.content.message).toBe(
    "Value is not a Some",
  );

  // Test with non-Option value
  const result3 = pipe(42, asSome);
  assert(isErr(result3));
  expect(result3.content.message).toBe(
    "Value is not a Some",
  );

  // Test with null/undefined
  const result4 = pipe(null, asSome);
  assert(isErr(result4));
  expect(result4.content.message).toBe(
    "Value is not a Some",
  );

  const result5 = pipe(undefined, asSome);
  assert(isErr(result5));
  expect(result5.content.message).toBe(
    "Value is not a Some",
  );
});
