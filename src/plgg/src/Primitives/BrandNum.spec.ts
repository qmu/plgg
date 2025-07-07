import { test, expect, assert } from "vitest";
import { BrandNum, isOk, isErr } from "plgg/index";

test("BrandNum.is type guard", () => {
  expect(BrandNum.is<"Age">(25)).toBe(true);
  expect(BrandNum.is<"Price">(99.99)).toBe(true);
  expect(BrandNum.is<"Age">(0)).toBe(true);
  expect(BrandNum.is<"Age">(-5)).toBe(true);
  expect(BrandNum.is<"Age">("25")).toBe(false);
  expect(BrandNum.is<"Age">(true)).toBe(false);
  expect(BrandNum.is<"Age">(null)).toBe(false);
  expect(BrandNum.is<"Age">(undefined)).toBe(false);
  expect(BrandNum.is<"Age">({})).toBe(false);
  expect(BrandNum.is<"Age">([])).toBe(false);
});

test("BrandNum.cast validation", async () => {
  const ageResult = BrandNum.cast<"Age">(25);
  assert(isOk(ageResult));
  expect(ageResult.ok).toBe(25);

  const priceResult = BrandNum.cast<"Price">(99.99);
  assert(isOk(priceResult));
  expect(priceResult.ok).toBe(99.99);

  const zeroResult = BrandNum.cast<"Age">(0);
  assert(isOk(zeroResult));
  expect(zeroResult.ok).toBe(0);

  const negativeResult = BrandNum.cast<"Age">(-5);
  assert(isOk(negativeResult));
  expect(negativeResult.ok).toBe(-5);

  const stringResult = BrandNum.cast<"Age">("25");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a branded number");

  const boolResult = BrandNum.cast<"Age">(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a branded number");

  const nullResult = BrandNum.cast<"Age">(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a branded number");

  const undefinedResult = BrandNum.cast<"Age">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a branded number");

  const objectResult = BrandNum.cast<"Age">({});
  assert(isErr(objectResult));
  expect(objectResult.err.message).toBe("Value is not a branded number");
});
