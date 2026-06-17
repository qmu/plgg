import { test, expect, assert } from "vitest";
import {
  isObjLike,
  forProp,
  forOptionProp,
  hasProp,
  asNum,
  asStr,
  isOk,
  isErr,
  isSome,
  isNone,
} from "plgg/index";

test("isObjLike accepts plain objects", () => {
  expect(isObjLike({})).toBe(true);
  expect(isObjLike({ a: 1 })).toBe(true);
});

test("isObjLike rejects primitives and null", () => {
  expect(isObjLike(null)).toBe(false);
  expect(isObjLike(undefined)).toBe(false);
  expect(isObjLike("str")).toBe(false);
  expect(isObjLike(42)).toBe(false);
  expect(isObjLike(true)).toBe(false);
});

test("forProp validates and preserves other fields", () => {
  const result = forProp("age", asNum)({
    age: 30,
    name: "alice",
  });
  assert(isOk(result));
  expect(result.content.age).toBe(30);
  expect(result.content.name).toBe("alice");
});

test("forProp fails for missing property", () => {
  const result = forProp("missing", asNum)({
    present: 1,
  });
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Property 'missing' not found",
  );
});

test("forProp fails for non-object input", () => {
  const result = forProp("key", asNum)(
    "not an object",
  );
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Not an object",
  );
});

test("forProp fails for null input", () => {
  const result = forProp("key", asNum)(null);
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Not an object",
  );
});

test("forOptionProp wraps present values in Some", () => {
  const result = forOptionProp("label", asStr)({
    label: "hi",
    age: 10,
  });
  assert(isOk(result));
  assert(isSome(result.content.label));
  expect(result.content.label.content).toEqual({
    __tag: "Str",
    content: "hi",
  });
});

test("forOptionProp yields None for missing property", () => {
  const result = forOptionProp(
    "label",
    asStr,
  )({ other: 1 });
  assert(isOk(result));
  assert(isNone(result.content.label));
});

test("forOptionProp fails for non-object input", () => {
  const result = forOptionProp(
    "key",
    asStr,
  )("scalar");
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Not an object",
  );
});

test("forOptionProp fails for null input", () => {
  const result = forOptionProp("key", asStr)(null);
  assert(isErr(result));
  expect(result.content.content.message).toBe(
    "Not an object",
  );
});

test("hasProp checks property existence", () => {
  expect(hasProp({ a: 1 }, "a")).toBe(true);
  expect(hasProp({ a: 1 }, "b")).toBe(false);
});
