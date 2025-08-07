import { test, expect, assert } from "vitest";
import { some, none, isSome, isNone, Option, mapOption, applyOption, ofOption, chainOption } from "plgg/index";

test("some creates Some option", () => {
  const result = some(42);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.content).toBe(42);
  }
});

test("some creates Some option with string", () => {
  const result = some("hello");
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.content).toBe("hello");
  }
});

test("some creates Some option with object", () => {
  const obj = { name: "test", age: 25 };
  const result = some(obj);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.content).toBe(obj);
    expect(result.content.name).toBe("test");
    expect(result.content.age).toBe(25);
  }
});

test("some creates Some option with null", () => {
  const result = some(null);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.content).toBe(null);
  }
});

test("some creates Some option with undefined", () => {
  const result = some(undefined);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.content).toBe(undefined);
  }
});

test("none creates None option", () => {
  const result = none();
  expect(result.__tag).toBe("None");
  assert(isNone(result));
});

test("none creates None option with type parameter", () => {
  const result = none();
  expect(result.__tag).toBe("None");
  assert(isNone(result));
});

test("isSome identifies Some options", () => {
  const someResult = some("content");
  const noneResult = none();

  assert(isSome(someResult));
  assert(!isSome(noneResult));
});

test("isNone identifies None options", () => {
  const someResult = some("content");
  const noneResult = none();

  assert(!isNone(someResult));
  assert(isNone(noneResult));
});

test("Option can handle different types", () => {
  const stringOption: Option<string> = some("hello");
  const numberOption: Option<number> = some(42);
  const noneStringOption: Option<string> = none();
  const noneNumberOption: Option<number> = none();

  assert(isSome(stringOption));
  assert(isSome(numberOption));
  assert(isNone(noneStringOption));
  assert(isNone(noneNumberOption));

  if (isSome(stringOption)) {
    expect(stringOption.content).toBe("hello");
  }

  if (isSome(numberOption)) {
    expect(numberOption.content).toBe(42);
  }
});

test("Option type structure", () => {
  const someOption = some(123);
  const noneOption = none();

  // Test that Some has the expected structure
  expect(someOption).toHaveProperty("__tag", "Some");
  expect(someOption).toHaveProperty("content", 123);
  expect(Object.keys(someOption)).toEqual(["__tag", "content"]);

  // Test that None has the expected structure
  expect(noneOption).toHaveProperty("__tag", "None");
  expect(Object.keys(noneOption)).toEqual(["__tag"]);
});

test("Option with complex types", () => {
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  const user: User = { id: 1, name: "John", email: "john@example.com" };
  const userOption = some(user);
  const noUserOption = none();

  assert(isSome(userOption));
  assert(isNone(noUserOption));

  if (isSome(userOption)) {
    expect(userOption.content.id).toBe(1);
    expect(userOption.content.name).toBe("John");
    expect(userOption.content.email).toBe("john@example.com");
  }
});

test("Option with array contents", () => {
  const numbers = [1, 2, 3, 4, 5];
  const arrayOption = some(numbers);
  const emptyArrayOption = some([]);
  const noneArrayOption = none();

  assert(isSome(arrayOption));
  assert(isSome(emptyArrayOption));
  assert(isNone(noneArrayOption));

  if (isSome(arrayOption)) {
    expect(arrayOption.content).toEqual([1, 2, 3, 4, 5]);
    expect(arrayOption.content.length).toBe(5);
  }

  if (isSome(emptyArrayOption)) {
    expect(emptyArrayOption.content).toEqual([]);
    expect(emptyArrayOption.content.length).toBe(0);
  }
});

test("Option with boolean contents", () => {
  const trueOption = some(true);
  const falseOption = some(false);
  const noneBoolOption = none();

  assert(isSome(trueOption));
  assert(isSome(falseOption));
  assert(isNone(noneBoolOption));

  if (isSome(trueOption)) {
    expect(trueOption.content).toBe(true);
  }

  if (isSome(falseOption)) {
    expect(falseOption.content).toBe(false);
  }
});

test("Option with zero contents", () => {
  const zeroOption = some(0);
  const emptyStringOption = some("");

  assert(isSome(zeroOption));
  assert(isSome(emptyStringOption));

  if (isSome(zeroOption)) {
    expect(zeroOption.content).toBe(0);
  }

  if (isSome(emptyStringOption)) {
    expect(emptyStringOption.content).toBe("");
  }
});

test("mapOption transforms Some values", () => {
  const double = (x: number) => x * 2;
  const someNumber = some(5);
  const noneNumber = none();

  const mappedSome = mapOption(double)(someNumber);
  const mappedNone = mapOption(double)(noneNumber);

  assert(isSome(mappedSome));
  expect(mappedSome.content).toBe(10);

  assert(isNone(mappedNone));
});

test("applyOption applies wrapped function to wrapped value", () => {
  const add = (x: number) => (y: number) => x + y;
  const someAdd3 = some(add(3));
  const someNumber = some(5);
  const noneAdd = none();
  const noneNumber = none();

  // Some function applied to Some value
  const result1 = applyOption(someAdd3)(someNumber);
  assert(isSome(result1));
  expect(result1.content).toBe(8);

  // None function applied to Some value
  const result2 = applyOption(noneAdd)(someNumber);
  assert(isNone(result2));

  // Some function applied to None value
  const result3 = applyOption(someAdd3)(noneNumber);
  assert(isNone(result3));

  // None function applied to None value
  const result4 = applyOption(noneAdd)(noneNumber);
  assert(isNone(result4));
});

test("ofOption creates Some with value", () => {
  const result1 = ofOption(42);
  const result2 = ofOption("hello");
  const result3 = ofOption(null);

  assert(isSome(result1));
  expect(result1.content).toBe(42);

  assert(isSome(result2));
  expect(result2.content).toBe("hello");

  assert(isSome(result3));
  expect(result3.content).toBe(null);
});

test("chainOption applies monadic bind", () => {
  const safeDivide = (y: number) => (x: number): Option<number> =>
    y === 0 ? none() : some(x / y);

  const someNumber = some(10);
  const noneNumber = none();

  // Chain with Some value - successful division
  const result1 = chainOption(safeDivide(2))(someNumber);
  assert(isSome(result1));
  expect(result1.content).toBe(5);

  // Chain with Some value - division by zero
  const result2 = chainOption(safeDivide(0))(someNumber);
  assert(isNone(result2));

  // Chain with None value
  const result3 = chainOption(safeDivide(2))(noneNumber);
  assert(isNone(result3));
});
