import { test, expect, assert } from "vitest";
import {
  isBool,
  asBool,
  isOk,
  isErr,
} from "plgg/index";

test("Bool.is type guard", () => {
  expect(isBool(true)).toBe(true);
  expect(isBool(false)).toBe(true);
  expect(isBool("true")).toBe(false);
  expect(isBool(1)).toBe(false);
  expect(isBool(0)).toBe(false);
  expect(isBool(null)).toBe(false);
  expect(isBool(undefined)).toBe(false);
  expect(isBool({})).toBe(false);
  expect(isBool([])).toBe(false);
});

test("Bool.cast validation", async () => {
  const trueResult = asBool(true);
  assert(isOk(trueResult));
  expect(trueResult.body).toBe(true);

  const falseResult = asBool(false);
  assert(isOk(falseResult));
  expect(falseResult.body).toBe(false);

  const stringResult = asBool("true");
  assert(isErr(stringResult));
  expect(stringResult.body.message).toBe(
    "Value is not a boolean",
  );

  const numberResult = asBool(1);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Value is not a boolean",
  );

  const nullResult = asBool(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Value is not a boolean",
  );
});
