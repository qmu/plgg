import { test, expect } from "vitest";
import { MaybePromise, isPromise } from "plgg/index";

test("MaybePromise accepts synchronous values", () => {
  const syncValue: MaybePromise<string> = "hello";
  expect(syncValue).toBe("hello");
});

test("MaybePromise accepts asynchronous values", async () => {
  const asyncValue: MaybePromise<string> = Promise.resolve("hello");
  expect(await asyncValue).toBe("hello");
});

test("isPromise correctly identifies Promise objects", () => {
  // Example: Conditional async handling
  const syncValue: MaybePromise<number> = 42;
  const asyncValue: MaybePromise<number> = Promise.resolve(42);
  
  expect(isPromise(syncValue)).toBe(false);
  expect(isPromise(asyncValue)).toBe(true);
  
  // Test rejected promise without causing unhandled rejection
  const rejectedPromise = Promise.reject(new Error());
  rejectedPromise.catch(() => {}); // Handle the rejection
  expect(isPromise(rejectedPromise)).toBe(true);
});

test("isPromise identifies thenable objects", () => {
  // Example: Testing with actual Promise instances and non-promises
  const actualPromise = Promise.resolve("test");
  const notThenable = { then: "not a function" };
  const objectWithThen = { then: () => {} };
  
  expect(isPromise(actualPromise)).toBe(true);
  expect(isPromise(objectWithThen)).toBe(true); // This is a thenable
  expect(isPromise(notThenable)).toBe(false);
  expect(isPromise(null)).toBe(false);
  expect(isPromise(undefined)).toBe(false);
  expect(isPromise("string")).toBe(false);
  expect(isPromise(123)).toBe(false);
});

test("isPromise works in async composition patterns", async () => {
  // Example: Conditional async processing
  const processValue = async (value: MaybePromise<string>) => {
    if (isPromise(value)) {
      const resolved = await value;
      return `async: ${resolved}`;
    }
    return `sync: ${value}`;
  };

  const syncResult = await processValue("hello");
  expect(syncResult).toBe("sync: hello");

  const asyncResult = await processValue(Promise.resolve("world"));
  expect(asyncResult).toBe("async: world");
});