import { test, expect, assert } from "vitest";
import {
  isTime,
  isOk,
  isErr,
  asTime,
} from "plgg/index";

test("Time.is type guard", () => {
  expect(isTime(new Date())).toBe(true);
  expect(isTime(new Date("2023-01-01"))).toBe(
    true,
  );
  expect(isTime("2023-01-01")).toBe(false);
  expect(isTime(1672531200000)).toBe(false);
  expect(isTime(null)).toBe(false);
  expect(isTime(undefined)).toBe(false);
  expect(isTime({})).toBe(false);
  expect(isTime([])).toBe(false);
});

test("Time.cast validation with Date objects", async () => {
  const date = new Date("2023-01-01");
  const validResult = asTime(date);
  assert(isOk(validResult));
  expect(validResult.body).toBe(date);

  const currentDate = new Date();
  const currentResult = asTime(currentDate);
  assert(isOk(currentResult));
  expect(currentResult.body).toBe(currentDate);
});

test("Time.cast validation with date strings", async () => {
  const iso8601Result = asTime(
    "2023-01-01T00:00:00.000Z",
  );
  assert(isOk(iso8601Result));
  expect(iso8601Result.body).toEqual(
    new Date("2023-01-01T00:00:00.000Z"),
  );

  const simpleDateResult = asTime("2023-01-01");
  assert(isOk(simpleDateResult));
  expect(simpleDateResult.body).toEqual(
    new Date("2023-01-01"),
  );

  const americanFormatResult =
    asTime("01/01/2023");
  assert(isOk(americanFormatResult));
  expect(americanFormatResult.body).toEqual(
    new Date("01/01/2023"),
  );
});

test("Time.cast validation with invalid inputs", async () => {
  const invalidStringResult =
    asTime("not-a-date");
  assert(isErr(invalidStringResult));
  expect(invalidStringResult.body.message).toBe(
    "Value is not a Date",
  );

  const numberResult = asTime(1672531200000);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Value is not a Date",
  );

  const boolResult = asTime(true);
  assert(isErr(boolResult));
  expect(boolResult.body.message).toBe(
    "Value is not a Date",
  );

  const nullResult = asTime(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Value is not a Date",
  );

  const undefinedResult = asTime(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.body.message).toBe(
    "Value is not a Date",
  );

  const emptyStringResult = asTime("");
  assert(isErr(emptyStringResult));
  expect(emptyStringResult.body.message).toBe(
    "Value is not a Date",
  );
});
