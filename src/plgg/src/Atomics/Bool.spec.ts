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
  expect(trueResult.content).toBe(true);

  const falseResult = asBool(false);
  assert(isOk(falseResult));
  expect(falseResult.content).toBe(false);

  const stringResult = asBool("true");
  assert(isErr(stringResult));
  expect(stringResult.content.message).toBe(
    "Value is not a boolean",
  );

  const numberResult = asBool(1);
  assert(isErr(numberResult));
  expect(numberResult.content.message).toBe(
    "Value is not a boolean",
  );

  const nullResult = asBool(null);
  assert(isErr(nullResult));
  expect(nullResult.content.message).toBe(
    "Value is not a boolean",
  );
});
