import { test, expect, assert } from "vitest";
import { BrandStr } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";

type UserId = BrandStr.t<"UserId">;
type Email = BrandStr.t<"Email">;

test("BrandStr.is type guard", () => {
  expect(BrandStr.is<"UserId">("user123")).toBe(true);
  expect(BrandStr.is<"Email">("test@example.com")).toBe(true);
  expect(BrandStr.is<"UserId">("")).toBe(true);
  expect(BrandStr.is<"UserId">(123)).toBe(false);
  expect(BrandStr.is<"UserId">(true)).toBe(false);
  expect(BrandStr.is<"UserId">(null)).toBe(false);
  expect(BrandStr.is<"UserId">(undefined)).toBe(false);
  expect(BrandStr.is<"UserId">({})).toBe(false);
  expect(BrandStr.is<"UserId">([])).toBe(false);
});

test("BrandStr.cast validation", async () => {
  const userIdResult = await BrandStr.cast<"UserId">("user123");
  assert(isOk(userIdResult));
  expect(userIdResult.ok).toBe("user123");

  const emailResult = await BrandStr.cast<"Email">("test@example.com");
  assert(isOk(emailResult));
  expect(emailResult.ok).toBe("test@example.com");

  const emptyResult = await BrandStr.cast<"UserId">("");
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toBe("");

  const numberResult = await BrandStr.cast<"UserId">(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not a branded string");

  const boolResult = await BrandStr.cast<"UserId">(true);
  assert(isErr(boolResult));
  expect(boolResult.err.message).toBe("Value is not a branded string");

  const nullResult = await BrandStr.cast<"UserId">(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not a branded string");

  const undefinedResult = await BrandStr.cast<"UserId">(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.err.message).toBe("Value is not a branded string");

  const objectResult = await BrandStr.cast<"UserId">({});
  assert(isErr(objectResult));
  expect(objectResult.err.message).toBe("Value is not a branded string");
});

test("BrandStr type safety", () => {
  const userId: UserId = "user123" as UserId;
  const email: Email = "test@example.com" as Email;
  
  expect(typeof userId).toBe("string");
  expect(typeof email).toBe("string");
  expect(userId).toBe("user123");
  expect(email).toBe("test@example.com");
});