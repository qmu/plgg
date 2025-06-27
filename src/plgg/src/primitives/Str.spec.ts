import { test, expect, assert } from "vitest";
import { Str } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";

test("Str.is type guard", () => {
  expect(Str.is("hello")).toBe(true);
  expect(Str.is("")).toBe(true);
  expect(Str.is("123")).toBe(true);
  expect(Str.is(123)).toBe(false);
  expect(Str.is(true)).toBe(false);
  expect(Str.is(null)).toBe(false);
  expect(Str.is(undefined)).toBe(false);
  expect(Str.is({})).toBe(false);
  expect(Str.is([])).toBe(false);
});

test("Str.cast validation", async () => {
  const validResult = Str.cast("hello");
  assert(isOk(validResult));
  expect(validResult.ok).toBe("hello");

  const emptyResult = Str.cast("");
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toBe("");

  const numberResult = Str.cast(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("123 is not a string");

  const boolResult = Str.cast(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("true is not a string");

  const nullResult = Str.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("null is not a string");

  const undefinedResult = Str.cast(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("undefined is not a string");
});

test("Str.lenGt validation", async () => {
  const lenGt3 = Str.lenGt(3);

  const validResult = lenGt3("hello");
  assert(isOk(validResult));
  expect(validResult.ok).toBe("hello");

  const equalLengthResult = lenGt3("abc");
  assert(isErr(equalLengthResult));
  expect(equalLengthResult.err.message).toBe(
    "The string abc is not longer than 3",
  );

  const shorterResult = lenGt3("ab");
  assert(isErr(shorterResult));
  expect(shorterResult.err.message).toBe("The string ab is not longer than 3");

  const emptyResult = lenGt3("");
  assert(isErr(emptyResult));
  expect(emptyResult.err.message).toBe("The string  is not longer than 3");
});

test("Str.lenLt validation", async () => {
  const lenLt3 = Str.lenLt(3);

  const validResult = lenLt3("ab");
  assert(isOk(validResult));
  expect(validResult.ok).toBe("ab");

  const emptyResult = lenLt3("");
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toBe("");

  const equalLengthResult = lenLt3("abc");
  assert(isErr(equalLengthResult));
  expect(equalLengthResult.err.message).toBe(
    "The string abc is not shorter than 3",
  );

  const longerResult = lenLt3("abcd");
  assert(isErr(longerResult));
  expect(longerResult.err.message).toBe(
    "The string abcd is not shorter than 3",
  );
});

