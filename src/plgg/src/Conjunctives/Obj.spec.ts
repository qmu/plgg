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
  mapObj,
  applyObj,
  ofObj,
  chainObj,
  foldrObj,
  foldlObj,
  traverseObj,
  sequenceObj,
  pipe,
} from "plgg/index";

test("Obj.is type guard", () => {
  expect(isObj({})).toBe(true);
  expect(isObj({ a: 1 })).toBe(true);
  expect(
    isObj({ a: "test", b: 123, c: true }),
  ).toBe(true);
  expect(isObj([])).toBe(true); // Arrays are objects in JavaScript
  expect(isObj(null)).toBe(false);
  expect(isObj(undefined)).toBe(false);
  expect(isObj("string")).toBe(false);
  expect(isObj(123)).toBe(false);
  expect(isObj(true)).toBe(false);
});

test("Obj.cast validation", async () => {
  const emptyResult = asObj({});
  assert(isOk(emptyResult));
  expect(emptyResult.content).toEqual({});

  const objectResult = asObj({ a: 1, b: "test" });
  assert(isOk(objectResult));
  expect(objectResult.content).toEqual({
    a: 1,
    b: "test",
  });

  const arrayResult = asObj([1, 2, 3]);
  assert(isOk(arrayResult));
  expect(arrayResult.content).toEqual([1, 2, 3]);

  const nullResult = asObj(null);
  assert(isErr(nullResult));
  expect(nullResult.content.message).toBe(
    "Not object",
  );

  const undefinedResult = asObj(undefined);
  assert(isErr(undefinedResult));
  expect(undefinedResult.content.message).toBe(
    "Not object",
  );

  const stringResult = asObj("test");
  assert(isErr(stringResult));
  expect(stringResult.content.message).toBe(
    "Not object",
  );

  const numberResult = asObj(123);
  assert(isErr(numberResult));
  expect(numberResult.content.message).toBe(
    "Not object",
  );
});

test("Obj.prop validation - success cases", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = forProp("name", asStr)(obj);
  assert(isOk(nameResult));
  expect(nameResult.content).toEqual({
    name: "John",
    age: 30,
  });

  const ageResult = forProp("age", asNum)(obj);
  assert(isOk(ageResult));
  expect(ageResult.content).toEqual({
    name: "John",
    age: 30,
  });
});

test("Obj.prop validation - missing property", async () => {
  const obj = { name: "John" };

  const ageResult = forProp("age", asNum)(obj);
  assert(isErr(ageResult));
  expect(ageResult.content.message).toBe(
    "Property 'age' not found",
  );
});

test("Obj.prop validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = forProp("age", asNum)(obj);
  assert(isErr(ageResult));
  expect(ageResult.content.message).toBe(
    "Value is not a number",
  );
});

test("Obj.prop validation - adds property to object type", async () => {
  const obj = { existing: "value" };
  const newKey = "newProp";

  const result = forProp(
    newKey,
    asStr,
  )({ ...obj, [newKey]: "test" });
  assert(isOk(result));
  expect(result.content).toEqual({
    existing: "value",
    newProp: "test",
  });
});

test("Obj.optional validation - property exists", async () => {
  const obj = { name: "John", age: 30 };

  const nameResult = forOptionProp(
    "name",
    asStr,
  )(obj);
  assert(isOk(nameResult));
  assert(isSome(nameResult.content.name));
  expect(nameResult.content.name.content).toBe(
    "John",
  );
  expect(nameResult.content.age).toBe(30);

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(obj);
  assert(isOk(ageResult));
  assert(isSome(ageResult.content.age));
  expect(ageResult.content.age.content).toBe(30);
});

test("Obj.optional validation - property missing", async () => {
  const obj = { name: "John" };

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(obj);
  assert(isOk(ageResult));
  assert(isNone(ageResult.content.age));
  expect(ageResult.content.name).toBe("John");
});

test("Obj.optional validation - invalid property type", async () => {
  const obj = { name: "John", age: "thirty" };

  const ageResult = forOptionProp(
    "age",
    asNum,
  )(obj);
  assert(isErr(ageResult));
  expect(ageResult.content.message).toBe(
    "Value is not a number",
  );
});

test("Obj.optional validation - adds optional property to object type", async () => {
  const obj = { existing: "value" };

  const result = forOptionProp(
    "optionalProp",
    asStr,
  )(obj);
  assert(isOk(result));
  assert(isNone(result.content.optionalProp));
  expect(result.content.existing).toBe("value");
});

test("Complex object validation with multiple properties", async () => {
  const obj = {
    name: "John",
    age: 30,
    email: "john@example.com",
  };

  // Chain multiple property validations
  const nameResult = forProp("name", asStr)(obj);
  assert(isOk(nameResult));

  const ageResult = forProp(
    "age",
    asNum,
  )(nameResult.content);
  assert(isOk(ageResult));

  const emailResult = forOptionProp(
    "email",
    asStr,
  )(ageResult.content);
  assert(isOk(emailResult));
  assert(isSome(emailResult.content.email));
  expect(emailResult.content.email.content).toBe(
    "john@example.com",
  );
});

test("mapObj - Functor instance", () => {
  const obj = { x: 1, y: 2 };
  const double = (n: number) => n * 2;
  
  const result = pipe(
    obj,
    mapObj((o: typeof obj) => ({ x: double(o.x), y: double(o.y) }))
  );
  expect(result).toEqual({ x: 2, y: 4 });
  
  const toString = (n: number) => n.toString();
  const stringResult = pipe(
    obj,
    mapObj((o: typeof obj) => ({ x: toString(o.x), y: toString(o.y) }))
  );
  expect(stringResult).toEqual({ x: "1", y: "2" });
});

test("ofObj - Pointed instance", () => {
  const obj = { name: "test", value: 42 };
  const result = pipe(obj, ofObj);
  expect(result).toEqual(obj);
  expect(result).toBe(obj);
  
  const primitiveObj = { count: 0 };
  const primitiveResult = pipe(primitiveObj, ofObj);
  expect(primitiveResult).toEqual(primitiveObj);
});

test("applyObj - Apply instance", () => {
  const addValues = (obj: { a: number; b: number }) => obj.a + obj.b;
  const obj = { a: 5, b: 3 };
  
  const result = pipe(obj, applyObj(addValues));
  expect(result).toBe(8);
  
  const transformObj = (obj: { name: string; age: number }) => ({ 
    fullName: obj.name.toUpperCase(), 
    isAdult: obj.age >= 18 
  });
  const personObj = { name: "alice", age: 25 };
  
  const transformResult = pipe(personObj, applyObj(transformObj));
  expect(transformResult).toEqual({ fullName: "ALICE", isAdult: true });
});

test("chainObj - Chain instance", () => {
  const obj = { value: 10 };
  
  const multiplyAndWrap = (o: typeof obj) => ({ result: o.value * 2 });
  const result = pipe(obj, chainObj(multiplyAndWrap));
  expect(result).toEqual({ result: 20 });
  
  const addFieldsAndWrap = (o: { x: number }) => ({ 
    original: o.x, 
    doubled: o.x * 2, 
    squared: o.x * o.x 
  });
  const numberObj = { x: 3 };
  const chainResult = pipe(numberObj, chainObj(addFieldsAndWrap));
  expect(chainResult).toEqual({ original: 3, doubled: 6, squared: 9 });
});

test("foldrObj - right fold", () => {
  const obj = { name: "Alice", age: 30 };
  
  const concatenateValues = (o: typeof obj, acc: string) => acc + JSON.stringify(o);
  const result = pipe(obj, foldrObj(concatenateValues)("start:"));
  expect(result).toBe('start:{"name":"Alice","age":30}');
  
  const sumNumericFields = (o: { a: number; b: number }, acc: number) => acc + o.a + o.b;
  const numObj = { a: 5, b: 10 };
  const sumResult = pipe(numObj, foldrObj(sumNumericFields)(0));
  expect(sumResult).toBe(15);
});

test("foldlObj - left fold", () => {
  const obj = { x: 2, y: 3 };
  
  const multiplyValues = (acc: number, o: typeof obj) => acc * o.x * o.y;
  const result = pipe(obj, foldlObj(multiplyValues)(1));
  expect(result).toBe(6);
  
  const appendObject = (acc: string, o: { name: string }) => acc + o.name;
  const nameObj = { name: "World" };
  const appendResult = pipe(nameObj, foldlObj(appendObject)("Hello "));
  expect(appendResult).toBe("Hello World");
});

test("traverseObj - function exists", () => {
  // Test that the traverse function exists and is exported
  expect(typeof traverseObj).toBe("function");
  expect(traverseObj).toBeDefined();
});

test("sequenceObj - function exists", () => {
  // Test that the sequence function exists and is exported
  expect(typeof sequenceObj).toBe("function");
  expect(sequenceObj).toBeDefined();
});
