import { test, expect, assert } from "vitest";
import {
  isMutRec,
  asMutRec,
  isOk,
  isErr,
  mapMutRec,
  applyMutRec,
  ofMutRec,
  chainMutRec,
  foldrMutRec,
  foldlMutRec,
  traverseMutRec,
  sequenceMutRec,
  pipe,
} from "plgg/index";

/**
 * Validates isMutRec type guard for various value types.
 */
test("isMutRec type guard", () => {
  expect(isMutRec({})).toBe(true);
  expect(isMutRec({ a: 1 })).toBe(true);
  expect(
    isMutRec({ a: "test", b: 123, c: true }),
  ).toBe(true);
  expect(isMutRec([])).toBe(true); // Arrays are records in JavaScript runtime
  expect(isMutRec(null)).toBe(false);
  expect(isMutRec(undefined)).toBe(false);
  expect(isMutRec("string")).toBe(false);
  expect(isMutRec(123)).toBe(false);
  expect(isMutRec(true)).toBe(false);
});

/**
 * Tests asMutRec validation for records and non-record types.
 */
test("asMutRec validation", async () => {
  const emptyResult = asMutRec({});
  assert(isOk(emptyResult));
  expect(emptyResult.body).toEqual({});

  const recResult = asMutRec({ a: 1, b: "test" });
  assert(isOk(recResult));
  expect(recResult.body).toEqual({
    a: 1,
    b: "test",
  });

  const arrayResult = asMutRec([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.body).toEqual([1, 2, 3]);

  const nullResult = asMutRec(null);
  assert(isErr(nullResult));
  expect(nullResult.body.message).toBe(
    "Not record",
  );

  const undefinedResult = asMutRec(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.body.message).toBe(
    "Not record",
  );

  const stringResult = asMutRec("test");
  assert(isErr(stringResult));
  expect(stringResult.body.message).toBe(
    "Not record",
  );

  const numberResult = asMutRec(123);
  assert(isErr(numberResult));
  expect(numberResult.body.message).toBe(
    "Not record",
  );
});

/**
 * Tests mutable record mapping functionality through Functor instance.
 */
test("mapMutRec - Functor instance", () => {
  const rec = { x: 1, y: 2 };
  const double = (n: number) => n * 2;

  const result = pipe(
    rec,
    mapMutRec((o: typeof rec) => ({
      x: double(o.x),
      y: double(o.y),
    })),
  );
  expect(result).toEqual({ x: 2, y: 4 });

  const toString = (n: number) => n.toString();
  const stringResult = pipe(
    rec,
    mapMutRec((o: typeof rec) => ({
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
test("ofMutRec - Pointed instance", () => {
  const rec = { name: "test", value: 42 };
  const result = pipe(rec, ofMutRec);
  expect(result).toEqual(rec);
  expect(result).toBe(rec);

  const primitiveRec = { count: 0 };
  const primitiveResult = pipe(
    primitiveRec,
    ofMutRec,
  );
  expect(primitiveResult).toEqual(primitiveRec);
});

/**
 * Tests function application over mutable records through Apply instance.
 */
test("applyMutRec - Apply instance", () => {
  const addValues = (rec: {
    a: number;
    b: number;
  }) => rec.a + rec.b;
  const rec = { a: 5, b: 3 };

  const result = pipe(rec, applyMutRec(addValues));
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
    applyMutRec(transformRec),
  );
  expect(transformResult).toEqual({
    fullName: "ALICE",
    isAdult: true,
  });
});

/**
 * Validates mutable record chaining operations through Chain instance.
 */
test("chainMutRec - Chain instance", () => {
  const rec = { value: 10 };

  const multiplyAndWrap = (o: typeof rec) => ({
    result: o.value * 2,
  });
  const result = pipe(
    rec,
    chainMutRec(multiplyAndWrap),
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
    chainMutRec(addFieldsAndWrap),
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
test("foldrMutRec - right fold", () => {
  const rec = { name: "Alice", age: 30 };

  const concatenateValues = (
    o: typeof rec,
    acc: string,
  ) => acc + JSON.stringify(o);
  const result = pipe(
    rec,
    foldrMutRec(concatenateValues)("start:"),
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
    foldrMutRec(sumNumericFields)(0),
  );
  expect(sumResult).toBe(15);
});

/**
 * Tests left-to-right folding operations on mutable records.
 */
test("foldlMutRec - left fold", () => {
  const rec = { x: 2, y: 3 };

  const multiplyValues = (
    acc: number,
    o: typeof rec,
  ) => acc * o.x * o.y;
  const result = pipe(
    rec,
    foldlMutRec(multiplyValues)(1),
  );
  expect(result).toBe(6);

  const appendrecord = (
    acc: string,
    o: { name: string },
  ) => acc + o.name;
  const nameRec = { name: "World" };
  const appendResult = pipe(
    nameRec,
    foldlMutRec(appendrecord)("Hello "),
  );
  expect(appendResult).toBe("Hello World");
});

/**
 * Verifies traverseMutRec function is exported and available.
 */
test("traverseMutRec - function exists", () => {
  // Verify traverse function availability for mutable record operations
  expect(typeof traverseMutRec).toBe("function");
  expect(traverseMutRec).toBeDefined();
});

/**
 * Verifies sequenceMutRec function is exported and available.
 */
test("sequenceMutRec - function exists", () => {
  // Verify sequence function availability for mutable record operations
  expect(typeof sequenceMutRec).toBe("function");
  expect(sequenceMutRec).toBeDefined();
});