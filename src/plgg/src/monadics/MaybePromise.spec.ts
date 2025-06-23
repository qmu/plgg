import { test, expect } from "vitest";
import { MaybePromise } from "plgg/index";

test("MaybePromise accepts synchronous values", () => {
  const syncValue: MaybePromise<string> = "hello";
  expect(syncValue).toBe("hello");
});

test("MaybePromise accepts asynchronous values", async () => {
  const asyncValue: MaybePromise<string> = Promise.resolve("hello");
  expect(await asyncValue).toBe("hello");
});

