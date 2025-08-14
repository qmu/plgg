import { test, expect, assert } from "vitest";
import { isBrandNum, asBrandNum, isOk, isErr } from "plgg/index";

test("BrandNum.is type guard", () => {
  expect(isBrandNum<"Age">(25)).toBe(true);
  expect(isBrandNum<"Price">(99.99)).toBe(true);
  expect(isBrandNum<"Age">(0)).toBe(true);
  expect(isBrandNum<"Age">(-5)).toBe(true);
  expect(isBrandNum<"Age">("25")).toBe(false);
  expect(isBrandNum<"Age">(true)).toBe(false);
  expect(isBrandNum<"Age">(null)).toBe(false);
  expect(isBrandNum<"Age">(undefined)).toBe(false);
  expect(isBrandNum<"Age">({})).toBe(false);
  expect(isBrandNum<"Age">([])).toBe(false);
});

test("BrandNum.cast validation", async () => {
  const ageResult = asBrandNum<"Age">(25);
  assert(isOk(ageResult));
  expect(ageResult.content).toBe(25);

  const priceResult = asBrandNum<"Price">(99.99);
  assert(isOk(priceResult));
  expect(priceResult.content).toBe(99.99);

  const zeroResult = asBrandNum<"Age">(0);
  assert(isOk(zeroResult));
  expect(zeroResult.content).toBe(0);

  const negativeResult = asBrandNum<"Age">(-5);
  assert(isOk(negativeResult));
  expect(negativeResult.content).toBe(-5);

  const stringResult = asBrandNum<"Age">("25");
  assert(isErr(stringResult));
  expect(stringResult.content.message).toBe("Value is not a branded number");

  const boolResult = asBrandNum<"Age">(true);
  assert(isErr(boolResult));
  expect(boolResult.content.message).toBe("Value is not a branded number");

  const nullResult = asBrandNum<"Age">(null);
  assert(isErr(nullResult));
  expect(nullResult.content.message).toBe("Value is not a branded number");

  const undefinedResult = asBrandNum<"Age">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.content.message).toBe("Value is not a branded number");

  const objectResult = asBrandNum<"Age">({});
  assert(isErr(objectResult));
  expect(objectResult.content.message).toBe("Value is not a branded number");
});
