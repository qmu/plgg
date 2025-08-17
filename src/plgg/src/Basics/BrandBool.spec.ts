import { test, expect, assert } from "vitest";
import {
  isBrandBool,
  asBrandBool,
  isOk,
  isErr,
} from "plgg/index";

test("BrandBool.is type guard", () => {
  expect(isBrandBool<"IsActive">(true)).toBe(
    true,
  );
  expect(isBrandBool<"IsAdmin">(false)).toBe(
    true,
  );
  expect(isBrandBool<"IsActive">("true")).toBe(
    false,
  );
  expect(isBrandBool<"IsActive">(1)).toBe(false);
  expect(isBrandBool<"IsActive">(0)).toBe(false);
  expect(isBrandBool<"IsActive">(null)).toBe(
    false,
  );
  expect(isBrandBool<"IsActive">(undefined)).toBe(
    false,
  );
  expect(isBrandBool<"IsActive">({})).toBe(false);
  expect(isBrandBool<"IsActive">([])).toBe(false);
});

test("BrandBool.cast validation", async () => {
  const isActiveResult =
    asBrandBool<"IsActive">(true);
  assert(isOk(isActiveResult));
  expect(isActiveResult.body).toBe(true);

  const isAdminResult =
    asBrandBool<"IsAdmin">(false);
  assert(isOk(isAdminResult));
  expect(isAdminResult.body).toBe(false);

  const stringResult =
    asBrandBool<"IsActive">("true");
  assert(isErr(stringResult));
  expect(stringResult.body.message).toBe(
    "Value is not a branded boolean",
  );

  const numberResult = asBrandBool<"IsActive">(1);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Value is not a branded boolean",
  );

  const zeroResult = asBrandBool<"IsActive">(0);
  assert(isErr(zeroResult));
  expect(zeroResult.body.message).toBe(
    "Value is not a branded boolean",
  );

  const nullResult =
    asBrandBool<"IsActive">(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Value is not a branded boolean",
  );

  const undefinedResult =
    asBrandBool<"IsActive">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.body.message).toBe(
    "Value is not a branded boolean",
  );

  const objectResult = asBrandBool<"IsActive">(
    {},
  );
  assert(isErr(objectResult));
  expect(objectResult.body.message).toBe(
    "Value is not a branded boolean",
  );
});
