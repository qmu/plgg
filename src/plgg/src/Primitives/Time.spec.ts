import { test, expect, assert } from "vitest";
import { isTime, isOk, isErr, castTime } from "plgg/index";

test("Time.is type guard", () => {
  expect(isTime(new Date())).toBe(true);
  expect(isTime(new Date("2023-01-01"))).toBe(true);
  expect(isTime("2023-01-01")).toBe(false);
  expect(isTime(1672531200000)).toBe(false);
  expect(isTime(null)).toBe(false);
  expect(isTime(undefined)).toBe(false);
  expect(isTime({})).toBe(false);
  expect(isTime([])).toBe(false);
});

test("Time.cast validation with Date objects", async () => {
  const date = new Date("2023-01-01");
  const validResult = castTime(date);
  assert(isOk(validResult));
  expect(validResult.ok).toBe(date);

  const currentDate = new Date();
  const currentResult = castTime(currentDate);
  assert(isOk(currentResult));
  expect(currentResult.ok).toBe(currentDate);
});

test("Time.cast validation with date strings", async () => {
  const iso8601Result = castTime("2023-01-01T00:00:00.000Z");
  assert(isOk(iso8601Result));
  expect(iso8601Result.ok).toEqual(new Date("2023-01-01T00:00:00.000Z"));

  const simpleDateResult = castTime("2023-01-01");
  assert(isOk(simpleDateResult));
  expect(simpleDateResult.ok).toEqual(new Date("2023-01-01"));

  const americanFormatResult = castTime("01/01/2023");
  assert(isOk(americanFormatResult));
  expect(americanFormatResult.ok).toEqual(new Date("01/01/2023"));
});

test("Time.cast validation with invalid inputs", async () => {
  const invalidStringResult = castTime("not-a-date");
  assert(isErr(invalidStringResult));
  expect(invalidStringResult.err.message).toBe("Value is not a Date");

  const numberResult = castTime(1672531200000);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a Date");

  const boolResult = castTime(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a Date");

  const nullResult = castTime(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a Date");

  const undefinedResult = castTime(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a Date");

  const emptyStringResult = castTime("");
  assert(isErr(emptyStringResult));
  expect(emptyStringResult.err.message).toBe("Value is not a Date");
});
