import { test, expect, assert } from "vitest";
import { Bool } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";

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
  const trueResult = await Bool.cast(true);
  assert(isOk(trueResult));
  expect(trueResult.ok).toBe(true);

  const falseResult = await Bool.cast(false);
  assert(isOk(falseResult));
  expect(falseResult.ok).toBe(false);

  const stringResult = await Bool.cast("true");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a boolean");

  const numberResult = await Bool.cast(1);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a boolean");

  const nullResult = await Bool.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a boolean");
});

test("Bool.isTrue validation", async () => {
  const trueResult = await Bool.isTrue(true);
  assert(isOk(trueResult));
  expect(trueResult.ok).toBe(true);

  const falseResult = await Bool.isTrue(false);
  assert(isErr(falseResult));
  expect(falseResult.err.message).toBe("Value is not true");

  const stringResult = await Bool.isTrue("true");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not true");

  const numberResult = await Bool.isTrue(1);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not true");
});

test("Bool.isFalse validation", async () => {
  const falseResult = await Bool.isFalse(false);
  assert(isOk(falseResult));
  expect(falseResult.ok).toBe(false);

  const trueResult = await Bool.isFalse(true);
  assert(isErr(trueResult));
  expect(trueResult.err.message).toBe("Value is not false");

  const stringResult = await Bool.isFalse("false");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not false");

  const numberResult = await Bool.isFalse(0);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not false");
});