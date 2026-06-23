import { test, expect, assert } from "plgg-test";
import { atIndex, isOk, isErr } from "plgg/index";

test("atIndex returns Ok with element at valid index", () => {
  const result = atIndex(1)([10, 20, 30]);
  assert(isOk(result));
  expect(result.content).toBe(20);
});

test("atIndex returns Ok at the first index", () => {
  const result = atIndex(0)(["a", "b"]);
  assert(isOk(result));
  expect(result.content).toBe("a");
});

test("atIndex returns Err for negative index", () => {
  const result = atIndex(-1)([1, 2, 3]);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Cannot access index -1",
  );
});

test("atIndex returns Err for out-of-bounds index", () => {
  const result = atIndex(5)([1, 2, 3]);
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Cannot access index 5",
  );
});

test("atIndex returns Err for non-array value", () => {
  const result = atIndex(0)("not-an-array");
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Cannot access index 0",
  );
});

test("atIndex returns Err for null", () => {
  const result = atIndex(0)(null);
  assert(isErr(result));
});
