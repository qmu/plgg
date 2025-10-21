import { test, expect, assert } from "vitest";
import {
  isRawObj,
  asRawObj,
  isOk,
  isErr,
  mapRawObj,
  applyRawObj,
  ofRawObj,
  chainRawObj,
  foldrRawObj,
  foldlRawObj,
  traverseRawObj,
  sequenceRawObj,
  pipe,
} from "plgg/index";

/**
 * Validates isMutRec type guard for various value types.
 */
test("isMutRec type guard", () => {
  expect(isRawObj({})).toBe(true);
  expect(isRawObj({ a: 1 })).toBe(true);
  expect(
    isRawObj({ a: "test", b: 123, c: true }),
  ).toBe(true);
  expect(isRawObj([])).toBe(true); // Arrays are records in JavaScript runtime
  expect(isRawObj(null)).toBe(false);
  expect(isRawObj(undefined)).toBe(false);
  expect(isRawObj("string")).toBe(false);
  expect(isRawObj(123)).toBe(false);
  expect(isRawObj(true)).toBe(false);
});

/**
 * Tests asRawObj validation for records and non-record types.
 */
test("asRawObj validation", async () => {
  const emptyResult = asRawObj({});
  assert(isOk(emptyResult));
  expect(emptyResult.content).toEqual({});

  const recResult = asRawObj({ a: 1, b: "test" });
  assert(isOk(recResult));
  expect(recResult.content).toEqual({
    a: 1,
    b: "test",
  });

  const arrayResult = asRawObj([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.content).toEqual([1, 2, 3]);

  const nullResult = asRawObj(null);
  assert(isErr(nullResult));
  expect(nullResult.content.message).toBe(
    "Not record",
  );

  const undefinedResult = asRawObj(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.content.message).toBe(
    "Not record",
  );

  const stringResult = asRawObj("test");
  assert(isErr(stringResult));
  expect(stringResult.content.message).toBe(
    "Not record",
  );

  const numberResult = asRawObj(123);
  assert(isErr(numberResult));
  expect(numberResult.content.message).toBe(
    "Not record",
  );
});

/**
 * Tests mutable record mapping functionality through Functor instance.
 */
test("mapRawObj - Functor instance", () => {
  const rec = { x: 1, y: 2 };
  const double = (n: number) => n * 2;

  const result = pipe(
    rec,
    mapRawObj((o: typeof rec) => ({
      x: double(o.x),
      y: double(o.y),
    })),
  );
  expect(result).toEqual({ x: 2, y: 4 });

  const toString = (n: number) => n.toString();
  const stringResult = pipe(
    rec,
    mapRawObj((o: typeof rec) => ({
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
 * Validates mutable record wrapping through Pointed instance.
 */
test("ofRawObj - Pointed instance", () => {
  const rec = { name: "test", value: 42 };
  const result = pipe(rec, ofRawObj);
  expect(result).toEqual(rec);
  expect(result).toBe(rec);

  const primitiveRec = { count: 0 };
  const primitiveResult = pipe(
    primitiveRec,
    ofRawObj,
  );
  expect(primitiveResult).toEqual(primitiveRec);
});

/**
 * Tests function application over mutable records through Apply instance.
 */
test("applyRawObj - Apply instance", () => {
  const addValues = (rec: {
    a: number;
    b: number;
  }) => rec.a + rec.b;
  const rec = { a: 5, b: 3 };

  const result = pipe(
    rec,
    applyRawObj(addValues),
  );
  expect(result).toBe(8);

  const transformRec = (rec: {
    name: string;
    age: number;
  }) => ({
    fullName: rec.name.toUpperCase(),
    isAdult: rec.age >= 18,
  });
  const personRec = { name: "alice", age: 25 };

  const transformResult = pipe(
    personRec,
    applyRawObj(transformRec),
  );
  expect(transformResult).toEqual({
    fullName: "ALICE",
    isAdult: true,
  });
});

/**
 * Validates mutable record chaining operations through Chain instance.
 */
test("chainRawObj - Chain instance", () => {
  const rec = { value: 10 };

  const multiplyAndWrap = (o: typeof rec) => ({
    result: o.value * 2,
  });
  const result = pipe(
    rec,
    chainRawObj(multiplyAndWrap),
  );
  expect(result).toEqual({ result: 20 });

  const addFieldsAndWrap = (o: {
    x: number;
  }) => ({
    original: o.x,
    doubled: o.x * 2,
    squared: o.x * o.x,
  });
  const numberRec = { x: 3 };
  const chainResult = pipe(
    numberRec,
    chainRawObj(addFieldsAndWrap),
  );
  expect(chainResult).toEqual({
    original: 3,
    doubled: 6,
    squared: 9,
  });
});

/**
 * Tests right-to-left folding operations on mutable records.
 */
test("foldrRawObj - right fold", () => {
  const rec = { name: "Alice", age: 30 };

  const concatenateValues = (
    o: typeof rec,
    acc: string,
  ) => acc + JSON.stringify(o);
  const result = pipe(
    rec,
    foldrRawObj(concatenateValues)("start:"),
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
    foldrRawObj(sumNumericFields)(0),
  );
  expect(sumResult).toBe(15);
});

/**
 * Tests left-to-right folding operations on mutable records.
 */
test("foldlRawObj - left fold", () => {
  const rec = { x: 2, y: 3 };

  const multiplyValues = (
    acc: number,
    o: typeof rec,
  ) => acc * o.x * o.y;
  const result = pipe(
    rec,
    foldlRawObj(multiplyValues)(1),
  );
  expect(result).toBe(6);

  const appendrecord = (
    acc: string,
    o: { name: string },
  ) => acc + o.name;
  const nameRec = { name: "World" };
  const appendResult = pipe(
    nameRec,
    foldlRawObj(appendrecord)("Hello "),
  );
  expect(appendResult).toBe("Hello World");
});

/**
 * Verifies traverseRawObj function is exported and available.
 */
test("traverseRawObj - function exists", () => {
  // Verify traverse function availability for mutable record operations
  expect(typeof traverseRawObj).toBe("function");
  expect(traverseRawObj).toBeDefined();
});

/**
 * Verifies sequenceRawObj function is exported and available.
 */
test("sequenceRawObj - function exists", () => {
  // Verify sequence function availability for mutable record operations
  expect(typeof sequenceRawObj).toBe("function");
  expect(sequenceRawObj).toBeDefined();
});
