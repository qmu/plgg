import { test, expect, assert } from "vitest";
import { some, none, isSome, isNone, Option } from "plgg/lib";

test("some creates Some option", () => {
  const result = some(42);
  expect(result._tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.value).toBe(42);
  }
});

test("some creates Some option with string", () => {
  const result = some("hello");
  expect(result._tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.value).toBe("hello");
  }
});

test("some creates Some option with object", () => {
  const obj = { name: "test", age: 25 };
  const result = some(obj);
  expect(result._tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.value).toBe(obj);
    expect(result.value.name).toBe("test");
    expect(result.value.age).toBe(25);
  }
});

test("some creates Some option with null", () => {
  const result = some(null);
  expect(result._tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.value).toBe(null);
  }
});

test("some creates Some option with undefined", () => {
  const result = some(undefined);
  expect(result._tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.value).toBe(undefined);
  }
});

test("none creates None option", () => {
  const result = none();
  expect(result._tag).toBe("None");
  assert(isNone(result));
});

test("none creates None option with type parameter", () => {
  const result = none<string>();
  expect(result._tag).toBe("None");
  assert(isNone(result));
});

test("isSome identifies Some options", () => {
  const someResult = some("value");
  const noneResult = none();

  assert(isSome(someResult));
  assert(!isSome(noneResult));
});

test("isNone identifies None options", () => {
  const someResult = some("value");
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
    expect(stringOption.value).toBe("hello");
  }

  if (isSome(numberOption)) {
    expect(numberOption.value).toBe(42);
  }
});

test("Option type structure", () => {
  const someOption = some(123);
  const noneOption = none();

  // Test that Some has the expected structure
  expect(someOption).toHaveProperty("_tag", "Some");
  expect(someOption).toHaveProperty("value", 123);
  expect(Object.keys(someOption)).toEqual(["_tag", "value"]);

  // Test that None has the expected structure
  expect(noneOption).toHaveProperty("_tag", "None");
  expect(Object.keys(noneOption)).toEqual(["_tag"]);
});

test("Option with complex types", () => {
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  const user: User = { id: 1, name: "John", email: "john@example.com" };
  const userOption = some(user);
  const noUserOption = none<User>();

  assert(isSome(userOption));
  assert(isNone(noUserOption));

  if (isSome(userOption)) {
    expect(userOption.value.id).toBe(1);
    expect(userOption.value.name).toBe("John");
    expect(userOption.value.email).toBe("john@example.com");
  }
});

test("Option with array values", () => {
  const numbers = [1, 2, 3, 4, 5];
  const arrayOption = some(numbers);
  const emptyArrayOption = some([]);
  const noneArrayOption = none<number[]>();

  assert(isSome(arrayOption));
  assert(isSome(emptyArrayOption));
  assert(isNone(noneArrayOption));

  if (isSome(arrayOption)) {
    expect(arrayOption.value).toEqual([1, 2, 3, 4, 5]);
    expect(arrayOption.value.length).toBe(5);
  }

  if (isSome(emptyArrayOption)) {
    expect(emptyArrayOption.value).toEqual([]);
    expect(emptyArrayOption.value.length).toBe(0);
  }
});

test("Option with boolean values", () => {
  const trueOption = some(true);
  const falseOption = some(false);
  const noneBoolOption = none<boolean>();

  assert(isSome(trueOption));
  assert(isSome(falseOption));
  assert(isNone(noneBoolOption));

  if (isSome(trueOption)) {
    expect(trueOption.value).toBe(true);
  }

  if (isSome(falseOption)) {
    expect(falseOption.value).toBe(false);
  }
});

test("Option with zero values", () => {
  const zeroOption = some(0);
  const emptyStringOption = some("");

  assert(isSome(zeroOption));
  assert(isSome(emptyStringOption));

  if (isSome(zeroOption)) {
    expect(zeroOption.value).toBe(0);
  }

  if (isSome(emptyStringOption)) {
    expect(emptyStringOption.value).toBe("");
  }
});