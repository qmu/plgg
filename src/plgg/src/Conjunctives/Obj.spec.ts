import { test, expect, assert } from "vitest";
import {
  isObj,
  castObj,
  castOptionalProp,
  castProp,
  castStr,
  castNum,
  isOk,
  isErr,
  isSome,
  isNone,
} from "plgg/index";

test("Obj.is type guard", () => {
  expect(isObj({})).toBe(true);
  expect(isObj({ a: 1 })).toBe(true);
  expect(isObj({ a: "test", b: 123, c: true })).toBe(true);
  expect(isObj([])).toBe(true); // Arrays are objects in JavaScript
  expect(isObj(null)).toBe(false);
  expect(isObj(undefined)).toBe(false);
  expect(isObj("string")).toBe(false);
  expect(isObj(123)).toBe(false);
  expect(isObj(true)).toBe(false);
});

test("Obj.cast validation", async () => {
  const emptyResult = castObj({});
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toEqual({});

  const objectResult = castObj({ a: 1, b: "test" });
  assert(isOk(objectResult));
  expect(objectResult.ok).toEqual({ a: 1, b: "test" });

  const arrayResult = castObj([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.ok).toEqual([1, 2, 3]);

  const nullResult = castObj(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Not object");

  const undefinedResult = castObj(undefined);
  assert(isErr(undefinedResult));
  expect(nullResult.err.message).toBe("Not object");

  const stringResult = castObj("test");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Not object");

  const numberResult = castObj(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Not object");
});

test("Obj.prop validation - success cases", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = castProp("name", castStr)(obj);
  assert(isOk(nameResult));
  expect(nameResult.ok).toEqual({ name: "John", age: 30 });

  const ageResult = castProp("age", castNum)(obj);
  assert(isOk(ageResult));
  expect(ageResult.ok).toEqual({ name: "John", age: 30 });
});

test("Obj.prop validation - missing property", async () => {
  const obj = { name: "John" };

  const ageResult = castProp("age", castNum)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Property 'age' not found");
});

test("Obj.prop validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = castProp("age", castNum)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Value is not a number");
});

test("Obj.prop validation - adds property to object type", async () => {
  const obj = { existing: "value" };
  const newKey = "newProp";

  const result = castProp(newKey, castStr)({ ...obj, [newKey]: "test" });
  assert(isOk(result));
  expect(result.ok).toEqual({ existing: "value", newProp: "test" });
});

test("Obj.optional validation - property exists", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = castOptionalProp("name", castStr)(obj);
  assert(isOk(nameResult));
  assert(isSome(nameResult.ok.name));
  expect(nameResult.ok.name.value).toBe("John");
  expect(nameResult.ok.age).toBe(30);

  const ageResult = castOptionalProp("age", castNum)(obj);
  assert(isOk(ageResult));
  assert(isSome(ageResult.ok.age));
  expect(ageResult.ok.age.value).toBe(30);
});

test("Obj.optional validation - property missing", async () => {
  const obj = { name: "John" };

  const ageResult = castOptionalProp("age", castNum)(obj);
  assert(isOk(ageResult));
  assert(isNone(ageResult.ok.age));
  expect(ageResult.ok.name).toBe("John");
});

test("Obj.optional validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = castOptionalProp("age", castNum)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Value is not a number");
});

test("Obj.optional validation - adds optional property to object type", async () => {
  const obj = { existing: "value" };

  const result = castOptionalProp("optionalProp", castStr)(obj);
  assert(isOk(result));
  assert(isNone(result.ok.optionalProp));
  expect(result.ok.existing).toBe("value");
});

test("Complex object validation with multiple properties", async () => {
  const obj = { name: "John", age: 30, email: "john@example.com" };

  // Chain multiple property validations
  const nameResult = castProp("name", castStr)(obj);
  assert(isOk(nameResult));

  const ageResult = castProp("age", castNum)(nameResult.ok);
  assert(isOk(ageResult));

  const emailResult = castOptionalProp("email", castStr)(ageResult.ok);
  assert(isOk(emailResult));
  assert(isSome(emailResult.ok.email));
  expect(emailResult.ok.email.value).toBe("john@example.com");
});
