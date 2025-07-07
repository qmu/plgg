import { test, expect, assert } from "vitest";
import { BrandBool, isOk, isErr } from "plgg/index";

test("BrandBool.is type guard", () => {
  expect(BrandBool.is<"IsActive">(true)).toBe(true);
  expect(BrandBool.is<"IsAdmin">(false)).toBe(true);
  expect(BrandBool.is<"IsActive">("true")).toBe(false);
  expect(BrandBool.is<"IsActive">(1)).toBe(false);
  expect(BrandBool.is<"IsActive">(0)).toBe(false);
  expect(BrandBool.is<"IsActive">(null)).toBe(false);
  expect(BrandBool.is<"IsActive">(undefined)).toBe(false);
  expect(BrandBool.is<"IsActive">({})).toBe(false);
  expect(BrandBool.is<"IsActive">([])).toBe(false);
});

test("BrandBool.cast validation", async () => {
  const isActiveResult = BrandBool.cast<"IsActive">(true);
  assert(isOk(isActiveResult));
  expect(isActiveResult.ok).toBe(true);

  const isAdminResult = BrandBool.cast<"IsAdmin">(false);
  assert(isOk(isAdminResult));
  expect(isAdminResult.ok).toBe(false);

  const stringResult = BrandBool.cast<"IsActive">("true");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not a branded boolean");

  const numberResult = BrandBool.cast<"IsActive">(1);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a branded boolean");

  const zeroResult = BrandBool.cast<"IsActive">(0);
  assert(isErr(zeroResult));
  expect(zeroResult.err.message).toBe("Value is not a branded boolean");

  const nullResult = BrandBool.cast<"IsActive">(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a branded boolean");

  const undefinedResult = BrandBool.cast<"IsActive">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a branded boolean");

  const objectResult = BrandBool.cast<"IsActive">({});
  assert(isErr(objectResult));
  expect(objectResult.err.message).toBe("Value is not a branded boolean");
});
