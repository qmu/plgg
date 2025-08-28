import { test, expect, assert } from "vitest";
import {
  isRec,
  asRec,
  forOptionProp,
  forProp,
  asStr,
  asNum,
  isOk,
  isErr,
  isSome,
  isNone,
  mapRec,
  ofRec,
  foldrRec,
  foldlRec,
  traverseRec,
  sequenceRec,
  pipe,
} from "plgg/index";

/**
 * Validates isRec type guard for various value types.
 */
test("isRec type guard", () => {
  expect(isRec({})).toBe(true);
  expect(isRec({ a: 1 })).toBe(true);
  expect(
    isRec({ a: "test", b: 123, c: true }),
  ).toBe(true);
  expect(isRec([])).toBe(true); // Arrays are records in JavaScript runtime
  expect(isRec(null)).toBe(false);
  expect(isRec(undefined)).toBe(false);
  expect(isRec("string")).toBe(false);
  expect(isRec(123)).toBe(false);
  expect(isRec(true)).toBe(false);
});

/**
 * Tests asRec validation for records and non-record types.
 */
test("asRec validation", async () => {
  const emptyResult = asRec({});
  assert(isOk(emptyResult));
  expect(emptyResult.body).toEqual({});

  const recResult = asRec({ a: 1, b: "test" });
  assert(isOk(recResult));
  expect(recResult.body).toEqual({
    a: 1,
    b: "test",
  });

  const arrayResult = asRec([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.body).toEqual([1, 2, 3]);

  const nullResult = asRec(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Not record",
  );

  const undefinedResult = asRec(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.body.message).toBe(
    "Not record",
  );

  const stringResult = asRec("test");
  assert(isErr(stringResult));
  expect(stringResult.body.message).toBe(
    "Not record",
  );

  const numberResult = asRec(123);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Not record",
  );
});

/**
 * Validates property extraction from records with successful cases.
 */
test("Rec.prop validation - success cases", async () => {
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
test("Rec.prop validation - missing property", async () => {
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
test("Rec.prop validation - invalid property type", async () => {
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
test("Rec.prop validation - adds property to record type", async () => {
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
test("Rec.optional validation - property exists", async () => {
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
test("Rec.optional validation - property missing", async () => {
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
test("Rec.optional validation - invalid property type", async () => {
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
test("Rec.optional validation - adds optional property to record type", async () => {
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

/**
 * Tests record mapping functionality through Functor instance.
 */
test("mapRec - Functor instance", () => {
  const rec = { x: 1, y: 2 };
  const double = (n: number) => n * 2;

  const result = pipe(
    rec,
    mapRec((o: typeof rec) => ({
      x: double(o.x),
      y: double(o.y),
    })),
  );
  expect(result).toEqual({ x: 2, y: 4 });

  const toString = (n: number) => n.toString();
  const stringResult = pipe(
    rec,
    mapRec((o: typeof rec) => ({
      x: toString(o.x),
      y: toString(o.y),
    })),
  );
  expect(stringResult).toEqual({
    x: "1",
    y: "2",
  });
});

/**
 * Validates record wrapping through Pointed instance.
 */
test("ofRec - Pointed instance", () => {
  const rec = { name: "test", value: 42 };
  const result = pipe(rec, ofRec);
  expect(result).toEqual(rec);
  expect(result).toBe(rec);

  const primitiveRec = { count: 0 };
  const primitiveResult = pipe(
    primitiveRec,
    ofRec,
  );
  expect(primitiveResult).toEqual(primitiveRec);
});

/**
 * Tests right-to-left folding operations on records.
 */
test("foldrRec - right fold", () => {
  const rec = { name: "Alice", age: 30 };

  const concatenateValues = (
    o: typeof rec,
    acc: string,
  ) => acc + JSON.stringify(o);
  const result = pipe(
    rec,
    foldrRec(concatenateValues)("start:"),
  );
  expect(result).toBe(
    'start:{"name":"Alice","age":30}',
  );

  const sumNumericFields = (
    o: { a: number; b: number },
    acc: number,
  ) => acc + o.a + o.b;
  const numRec = { a: 5, b: 10 };
  const sumResult = pipe(
    numRec,
    foldrRec(sumNumericFields)(0),
  );
  expect(sumResult).toBe(15);
});

/**
 * Tests left-to-right folding operations on records.
 */
test("foldlRec - left fold", () => {
  const rec = { x: 2, y: 3 };

  const multiplyValues = (
    acc: number,
    o: typeof rec,
  ) => acc * o.x * o.y;
  const result = pipe(
    rec,
    foldlRec(multiplyValues)(1),
  );
  expect(result).toBe(6);

  const appendrecord = (
    acc: string,
    o: { name: string },
  ) => acc + o.name;
  const nameRec = { name: "World" };
  const appendResult = pipe(
    nameRec,
    foldlRec(appendrecord)("Hello "),
  );
  expect(appendResult).toBe("Hello World");
});

/**
 * Verifies traverseRec function is exported and available.
 */
test("traverseRec - function exists", () => {
  // Verify traverse function availability for record operations
  expect(typeof traverseRec).toBe("function");
  expect(traverseRec).toBeDefined();
});

/**
 * Verifies sequenceRec function is exported and available.
 */
test("sequenceRec - function exists", () => {
  // Verify sequence function availability for record operations
  expect(typeof sequenceRec).toBe("function");
  expect(sequenceRec).toBeDefined();
});
