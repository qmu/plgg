import { test, expect, assert } from "plgg-test";
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
  expect(validResult.content).toBe(date);

  const currentDate = new Date();
  const currentResult = asTime(currentDate);
  assert(isOk(currentResult));
  expect(currentResult.content).toBe(currentDate);
});

test("Time.cast validation with date strings", async () => {
  const iso8601Result = asTime(
    "2023-01-01T00:00:00.000Z",
  );
  assert(isOk(iso8601Result));
  expect(iso8601Result.content).toEqual(
    new Date("2023-01-01T00:00:00.000Z"),
  );

  const simpleDateResult = asTime("2023-01-01");
  assert(isOk(simpleDateResult));
  expect(simpleDateResult.content).toEqual(
    new Date("2023-01-01"),
  );

  const americanFormatResult =
    asTime("01/01/2023");
  assert(isOk(americanFormatResult));
  expect(americanFormatResult.content).toEqual(
    new Date("01/01/2023"),
  );
});

test("Time.cast validation with invalid inputs", async () => {
  const invalidStringResult =
    asTime("not-a-date");
  assert(isErr(invalidStringResult));
  expect(
    invalidStringResult.content.content.message,
  ).toBe("Value is not a Date");

  const numberResult = asTime(1672531200000);
  assert(isErr(numberResult));
  expect(numberResult.content.content.message).toBe(
    "Value is not a Date",
  );

  const boolResult = asTime(true);
  assert(isErr(boolResult));
  expect(boolResult.content.content.message).toBe(
    "Value is not a Date",
  );

  const nullResult = asTime(null);
  assert(isErr(nullResult));
  expect(nullResult.content.content.message).toBe(
    "Value is not a Date",
  );

  const undefinedResult = asTime(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.content.content.message).toBe(
    "Value is not a Date",
  );

  const emptyStringResult = asTime("");
  assert(isErr(emptyStringResult));
  expect(emptyStringResult.content.content.message).toBe(
    "Value is not a Date",
  );
});
