import { test, expect, assert } from "vitest";
import { Bool, isOk, isErr } from "plgg/index";

test("Bool.is type guard", () => {
  expect(Bool.is(true)).toBe(true);
  expect(Bool.is(false)).toBe(true);
  expect(Bool.is("true")).toBe(false);
  expect(Bool.is(1)).toBe(false);
  expect(Bool.is(0)).toBe(false);
  expect(Bool.is(null)).toBe(false);
  expect(Bool.is(undefined)).toBe(false);
  expect(Bool.is({})).toBe(false);
  expect(Bool.is([])).toBe(false);
});

test("Bool.cast validation", async () => {
  const trueResult = Bool.cast(true);
  assert(isOk(trueResult));
  expect(trueResult.ok).toBe(true);

  const falseResult = Bool.cast(false);
  assert(isOk(falseResult));
  expect(falseResult.ok).toBe(false);

  const stringResult = Bool.cast("true");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a boolean");

  const numberResult = Bool.cast(1);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a boolean");

  const nullResult = Bool.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a boolean");
});

test("Bool.isTrue validation", async () => {
  const trueResult = Bool.isTrue(true);
  assert(isOk(trueResult));
  expect(trueResult.ok).toBe(true);

  const falseResult = Bool.isTrue(false);
  assert(isErr(falseResult));
  expect(falseResult.err.message).toBe("Value is not true");

  const stringResult = Bool.isTrue("true");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not true");

  const numberResult = Bool.isTrue(1);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not true");
});

test("Bool.isFalse validation", async () => {
  const falseResult = Bool.isFalse(false);
  assert(isOk(falseResult));
  expect(falseResult.ok).toBe(false);

  const trueResult = Bool.isFalse(true);
  assert(isErr(trueResult));
  expect(trueResult.err.message).toBe("Value is not false");

  const stringResult = Bool.isFalse("false");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not false");

  const numberResult = Bool.isFalse(0);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not false");
});
