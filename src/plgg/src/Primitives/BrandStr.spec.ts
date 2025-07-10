import { test, expect, assert } from "vitest";
import { isBrandStr, castBrandStr, isOk, isErr } from "plgg/index";

test("BrandStr.is type guard", () => {
  expect(isBrandStr<"UserId">("user123")).toBe(true);
  expect(isBrandStr<"Email">("test@example.com")).toBe(true);
  expect(isBrandStr<"UserId">("")).toBe(true);
  expect(isBrandStr<"UserId">(123)).toBe(false);
  expect(isBrandStr<"UserId">(true)).toBe(false);
  expect(isBrandStr<"UserId">(null)).toBe(false);
  expect(isBrandStr<"UserId">(undefined)).toBe(false);
  expect(isBrandStr<"UserId">({})).toBe(false);
  expect(isBrandStr<"UserId">([])).toBe(false);
});

test("BrandStr.cast validation", async () => {
  const userIdResult = castBrandStr<"UserId">("user123");
  assert(isOk(userIdResult));
  expect(userIdResult.ok).toBe("user123");

  const emailResult = castBrandStr<"Email">("test@example.com");
  assert(isOk(emailResult));
  expect(emailResult.ok).toBe("test@example.com");

  const emptyResult = castBrandStr<"UserId">("");
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toBe("");

  const numberResult = castBrandStr<"UserId">(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a branded string");

  const boolResult = castBrandStr<"UserId">(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a branded string");

  const nullResult = castBrandStr<"UserId">(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a branded string");

  const undefinedResult = castBrandStr<"UserId">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a branded string");

  const objectResult = castBrandStr<"UserId">({});
  assert(isErr(objectResult));
  expect(objectResult.err.message).toBe("Value is not a branded string");
});
