import { test, expect, assert } from "vitest";
import { Time } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";

test("Time.is type guard", () => {
  expect(Time.is(new Date())).toBe(true);
  expect(Time.is(new Date("2023-01-01"))).toBe(true);
  expect(Time.is("2023-01-01")).toBe(false);
  expect(Time.is(1672531200000)).toBe(false);
  expect(Time.is(null)).toBe(false);
  expect(Time.is(undefined)).toBe(false);
  expect(Time.is({})).toBe(false);
  expect(Time.is([])).toBe(false);
});

test("Time.cast validation with Date objects", async () => {
  const date = new Date("2023-01-01");
  const validResult = Time.cast(date);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(date);

  const currentDate = new Date();
  const currentResult = Time.cast(currentDate);
  assert(isOk(currentResult));
  expect(currentResult.ok).toBe(currentDate);
});

test("Time.cast validation with date strings", async () => {
  const iso8601Result = Time.cast("2023-01-01T00:00:00.000Z");
  assert(isOk(iso8601Result));
  expect(iso8601Result.ok).toEqual(new Date("2023-01-01T00:00:00.000Z"));

  const simpleDateResult = Time.cast("2023-01-01");
  assert(isOk(simpleDateResult));
  expect(simpleDateResult.ok).toEqual(new Date("2023-01-01"));

  const americanFormatResult = Time.cast("01/01/2023");
  assert(isOk(americanFormatResult));
  expect(americanFormatResult.ok).toEqual(new Date("01/01/2023"));
});

test("Time.cast validation with invalid inputs", async () => {
  const invalidStringResult = Time.cast("not-a-date");
  assert(isErr(invalidStringResult));
  expect(invalidStringResult.err.message).toBe("Value is not a Date");

  const numberResult = Time.cast(1672531200000);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a Date");

  const boolResult = Time.cast(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a Date");

  const nullResult = Time.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a Date");

  const undefinedResult = Time.cast(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a Date");

  const emptyStringResult = Time.cast("");
  assert(isErr(emptyStringResult));
  expect(emptyStringResult.err.message).toBe("Value is not a Date");
});

