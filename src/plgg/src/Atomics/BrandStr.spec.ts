import { test, expect, assert } from "vitest";
import { isBrandStr, asBrandStr, isOk, isErr } from "plgg/index";

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
  const userIdResult = asBrandStr<"UserId">("user123");
  assert(isOk(userIdResult));
  expect(userIdResult.content).toBe("user123");

  const emailResult = asBrandStr<"Email">("test@example.com");
  assert(isOk(emailResult));
  expect(emailResult.content).toBe("test@example.com");

  const emptyResult = asBrandStr<"UserId">("");
  assert(isOk(emptyResult));
  expect(emptyResult.content).toBe("");

  const numberResult = asBrandStr<"UserId">(123);
  assert(isErr(numberResult));
  expect(numberResult.content.message).toBe("Value is not a branded string");

  const boolResult = asBrandStr<"UserId">(true);
  assert(isErr(boolResult));
  expect(boolResult.content.message).toBe("Value is not a branded string");

  const nullResult = asBrandStr<"UserId">(null);
  assert(isErr(nullResult));
  expect(nullResult.content.message).toBe("Value is not a branded string");

  const undefinedResult = asBrandStr<"UserId">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.content.message).toBe("Value is not a branded string");

  const objectResult = asBrandStr<"UserId">({});
  assert(isErr(objectResult));
  expect(objectResult.content.message).toBe("Value is not a branded string");
});
