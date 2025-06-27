import { test, expect, assert } from "vitest";
import { Obj, Str, Num } from "plgg/index";
import { isOk, isErr } from "plgg/effectfuls/Result";
import { isSome, isNone } from "plgg/effectfuls/Option";

test("Obj.is type guard", () => {
  expect(Obj.is({})).toBe(true);
  expect(Obj.is({ a: 1 })).toBe(true);
  expect(Obj.is({ a: "test", b: 123, c: true })).toBe(true);
  expect(Obj.is([])).toBe(true); // Arrays are objects in JavaScript
  expect(Obj.is(null)).toBe(false);
  expect(Obj.is(undefined)).toBe(false);
  expect(Obj.is("string")).toBe(false);
  expect(Obj.is(123)).toBe(false);
  expect(Obj.is(true)).toBe(false);
});

test("Obj.cast validation", async () => {
  const emptyResult = Obj.cast({});
  assert(isOk(emptyResult));
  expect(emptyResult.ok).toEqual({});

  const objectResult = Obj.cast({ a: 1, b: "test" });
  assert(isOk(objectResult));
  expect(objectResult.ok).toEqual({ a: 1, b: "test" });

  const arrayResult = Obj.cast([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.ok).toEqual([1, 2, 3]);

  const nullResult = Obj.cast(null);
  assert(isErr(nullResult));
  expect(nullResult.err.message).toBe("Value is not an object");

  const undefinedResult = Obj.cast(undefined);
  assert(isErr(undefinedResult));
  expect(nullResult.err.message).toBe("Value is not an object");

  const stringResult = Obj.cast("test");
  assert(isErr(stringResult));
  expect(stringResult.err.message).toBe("Value is not an object");

  const numberResult = Obj.cast(123);
  assert(isErr(numberResult));
  expect(numberResult.err.message).toBe("Value is not an object");
});

test("Obj.prop validation - success cases", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = await Obj.prop("name", Str.cast)(obj);
  assert(isOk(nameResult));
  expect(nameResult.ok).toEqual({ name: "John", age: 30 });

  const ageResult = await Obj.prop("age", Num.cast)(obj);
  assert(isOk(ageResult));
  expect(ageResult.ok).toEqual({ name: "John", age: 30 });
});

test("Obj.prop validation - missing property", async () => {
  const obj = { name: "John" };

  const ageResult = await Obj.prop("age", Num.cast)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Value does not have property 'age'");
});

test("Obj.prop validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = await Obj.prop("age", Num.cast)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Value is not a number");
});

test("Obj.prop validation - adds property to object type", async () => {
  const obj = { existing: "value" };
  const newKey = "newProp";

  const result = await Obj.prop(newKey, Str.cast)({ ...obj, [newKey]: "test" });
  assert(isOk(result));
  expect(result.ok).toEqual({ existing: "value", newProp: "test" });
});

test("Obj.optional validation - property exists", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = await Obj.optional("name", Str.cast)(obj);
  assert(isOk(nameResult));
  assert(isSome(nameResult.ok.name));
  expect(nameResult.ok.name.value).toBe("John");
  expect(nameResult.ok.age).toBe(30);

  const ageResult = await Obj.optional("age", Num.cast)(obj);
  assert(isOk(ageResult));
  assert(isSome(ageResult.ok.age));
  expect(ageResult.ok.age.value).toBe(30);
});

test("Obj.optional validation - property missing", async () => {
  const obj = { name: "John" };

  const ageResult = await Obj.optional("age", Num.cast)(obj);
  assert(isOk(ageResult));
  assert(isNone(ageResult.ok.age));
  expect(ageResult.ok.name).toBe("John");
});

test("Obj.optional validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = await Obj.optional("age", Num.cast)(obj);
  assert(isErr(ageResult));
  expect(ageResult.err.message).toBe("Value is not a number");
});

test("Obj.optional validation - adds optional property to object type", async () => {
  const obj = { existing: "value" };

  const result = await Obj.optional("optionalProp", Str.cast)(obj);
  assert(isOk(result));
  assert(isNone(result.ok.optionalProp));
  expect(result.ok.existing).toBe("value");
});

test("Complex object validation with multiple properties", async () => {
  const obj = { name: "John", age: 30, email: "john@example.com" };

  // Chain multiple property validations
  const nameResult = await Obj.prop("name", Str.cast)(obj);
  assert(isOk(nameResult));

  const ageResult = await Obj.prop("age", Num.cast)(nameResult.ok);
  assert(isOk(ageResult));

  const emailResult = await Obj.optional("email", Str.cast)(ageResult.ok);
  assert(isOk(emailResult));
  assert(isSome(emailResult.ok.email));
  expect(emailResult.ok.email.value).toBe("john@example.com");
});
