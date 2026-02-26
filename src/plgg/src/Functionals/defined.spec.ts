import { test, expect, assert } from "vitest";
import { defined, isOk, isErr } from "plgg/index";

test("defined checks for non-undefined values", () => {
  // Example: Handling optional values
  const validValue = defined("hello");
  assert(isOk(validValue));
  expect(validValue.content).toBe("hello");

  const undefinedValue = defined(undefined);
  assert(isErr(undefinedValue));
  expect(undefinedValue.content.message).toBe(
    "Value is undefined",
  );
});
