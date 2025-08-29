import { test, expect, assert } from "vitest";
import {
  isObj,
  asObj,
  forOptionProp,
  forProp,
  asStr,
  asNum,
  isOk,
  isErr,
  isSome,
  isNone,
} from "plgg/index";

/**
 * Validates isObj type guard for various value types.
 */
test("isObj type guard", () => {
  expect(isObj({})).toBe(true);
  expect(isObj({ a: 1 })).toBe(true);
  expect(
    isObj({ a: "test", b: 123, c: true }),
  ).toBe(true);
  expect(isObj([])).toBe(true); // Arrays are records in JavaScript runtime
  expect(isObj(null)).toBe(false);
  expect(isObj(undefined)).toBe(false);
  expect(isObj("string")).toBe(false);
  expect(isObj(123)).toBe(false);
  expect(isObj(true)).toBe(false);
});

/**
 * Tests asObj validation for records and non-record types.
 */
test("asObj validation", async () => {
  const emptyResult = asObj({});
  assert(isOk(emptyResult));
  expect(emptyResult.body).toEqual({});

  const recResult = asObj({ a: 1, b: "test" });
  assert(isOk(recResult));
  expect(recResult.body).toEqual({
    a: 1,
    b: "test",
  });

  const arrayResult = asObj([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.body).toEqual([1, 2, 3]);

  const nullResult = asObj(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Not record",
  );

  const undefinedResult = asObj(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.body.message).toBe(
    "Not record",
  );

  const stringResult = asObj("test");
  assert(isErr(stringResult));
  expect(stringResult.body.message).toBe(
    "Not record",
  );

  const numberResult = asObj(123);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Not record",
  );
});

/**
 * Validates property extraction from records with successful cases.
 */
test("Obj.prop validation - success cases", async () => {
  const rec = { name: "John", age: 30 };

  const nameResult = forProp("name", asStr)(rec);
  assert(isOk(nameResult));
  expect(nameResult.body).toEqual({
    name: "John",
    age: 30,
  });

  const ageResult = forProp("age", asNum)(rec);
  assert(isOk(ageResult));
  expect(ageResult.body).toEqual({
    name: "John",
    age: 30,
  });
});

/**
 * Tests property validation error handling for missing properties.
 */
test("Obj.prop validation - missing property", async () => {
  const rec = { name: "John" };

  const ageResult = forProp("age", asNum)(rec);
  assert(isErr(ageResult));
  expect(ageResult.body.message).toBe(
    "Property 'age' not found",
  );
});

/**
 * Validates error handling when property types don't match expected types.
 */
test("Obj.prop validation - invalid property type", async () => {
  const rec = { name: "John", age: "thirty" };

  const ageResult = forProp("age", asNum)(rec);
  assert(isErr(ageResult));
  expect(ageResult.body.message).toBe(
    "Value is not a number",
  );
});

/**
 * Tests that property validation preserves existing properties in record.
 */
test("Obj.prop validation - adds property to record type", async () => {
  const rec = { existing: "value" };
  const newKey = "newProp";

  const result = forProp(
    newKey,
    asStr,
  )({ ...rec, [newKey]: "test" });
  assert(isOk(result));
  expect(result.body).toEqual({
    existing: "value",
    newProp: "test",
  });
});

/**
 * Validates optional property extraction when properties exist.
 */
test("Obj.optional validation - property exists", async () => {
  const rec = { name: "John", age: 30 };

  const nameResult = forOptionProp(
    "name",
    asStr,
  )(rec);
  assert(isOk(nameResult));
  assert(isSome(nameResult.body.name));
  expect(nameResult.body.name.body).toBe("John");
  expect(nameResult.body.age).toBe(30);

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(rec);
  assert(isOk(ageResult));
  assert(isSome(ageResult.body.age));
  expect(ageResult.body.age.body).toBe(30);
});

/**
 * Tests optional property handling when properties are absent.
 */
test("Obj.optional validation - property missing", async () => {
  const rec = { name: "John" };

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(rec);
  assert(isOk(ageResult));
  assert(isNone(ageResult.body.age));
  expect(ageResult.body.name).toBe("John");
});

/**
 * Validates error handling for optional properties with invalid types.
 */
test("Obj.optional validation - invalid property type", async () => {
  const rec = { name: "John", age: "thirty" };

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(rec);
  assert(isErr(ageResult));
  expect(ageResult.body.message).toBe(
    "Value is not a number",
  );
});

/**
 * Tests optional property validation with absent properties in record.
 */
test("Obj.optional validation - adds optional property to record type", async () => {
  const rec = { existing: "value" };

  const result = forOptionProp(
    "optionalProp",
    asStr,
  )(rec);
  assert(isOk(result));
  assert(isNone(result.body.optionalProp));
  expect(result.body.existing).toBe("value");
});

/**
 * Validates complex record structures with chained property validations.
 */
test("Complex record validation with multiple properties", async () => {
  const rec = {
    name: "John",
    age: 30,
    email: "john@example.com",
  };

  // Demonstrates chained property validation workflow
  const nameResult = forProp("name", asStr)(rec);
  assert(isOk(nameResult));

  const ageResult = forProp(
    "age",
    asNum,
  )(nameResult.body);
  assert(isOk(ageResult));

  const emailResult = forOptionProp(
    "email",
    asStr,
  )(ageResult.body);
  assert(isOk(emailResult));
  assert(isSome(emailResult.body.email));
  expect(emailResult.body.email.body).toBe(
    "john@example.com",
  );
});
