import { test, expect, assert } from "vitest";
import {
  newSome,
  newNone,
  isSome,
  isNone,
  isOption,
  Option,
  mapOption,
  applyOption,
  ofOption,
  chainOption,
  pipe,
} from "plgg/index";

test("some creates Some option", () => {
  const result = newSome(42);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.body).toBe(42);
  }
});

test("some creates Some option with string", () => {
  const result = newSome("hello");
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.body).toBe("hello");
  }
});

test("some creates Some option with object", () => {
  const obj = { name: "test", age: 25 };
  const result = newSome(obj);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.body).toBe(obj);
    expect(result.body.name).toBe("test");
    expect(result.body.age).toBe(25);
  }
});

test("some creates Some option with null", () => {
  const result = newSome(null);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.body).toBe(null);
  }
});

test("some creates Some option with undefined", () => {
  const result = newSome(undefined);
  expect(result.__tag).toBe("Some");
  assert(isSome(result));
  if (isSome(result)) {
    expect(result.body).toBe(undefined);
  }
});

test("none creates None option", () => {
  const result = newNone();
  expect(result.__tag).toBe("None");
  assert(isNone(result));
});

test("none creates None option with type parameter", () => {
  const result = newNone();
  expect(result.__tag).toBe("None");
  assert(isNone(result));
});

test("isSome identifies Some options", () => {
  const someResult = newSome("body");
  const noneResult = newNone();

  assert(isSome(someResult));
  assert(!isSome(noneResult));
});

test("isNone identifies None options", () => {
  const someResult = newSome("body");
  const noneResult = newNone();

  assert(!isNone(someResult));
  assert(isNone(noneResult));
});

test("Option can handle different types", () => {
  const stringOption: Option<string> =
    newSome("hello");
  const numberOption: Option<number> =
    newSome(42);
  const noneStringOption: Option<string> =
    newNone();
  const noneNumberOption: Option<number> =
    newNone();

  assert(isSome(stringOption));
  assert(isSome(numberOption));
  assert(isNone(noneStringOption));
  assert(isNone(noneNumberOption));

  if (isSome(stringOption)) {
    expect(stringOption.body).toBe("hello");
  }

  if (isSome(numberOption)) {
    expect(numberOption.body).toBe(42);
  }
});

test("Option type structure", () => {
  const someOption = newSome(123);
  const noneOption = newNone();

  // Test that Some has the expected structure
  expect(someOption).toHaveProperty(
    "__tag",
    "Some",
  );
  expect(someOption).toHaveProperty("body", 123);
  expect(Object.keys(someOption)).toEqual([
    "__tag",
    "body",
  ]);

  // Test that None has the expected structure
  expect(noneOption).toHaveProperty(
    "__tag",
    "None",
  );
  expect(Object.keys(noneOption)).toEqual([
    "__tag",
  ]);
});

test("Option with complex types", () => {
  interface User {
    id: number;
    name: string;
    email?: string;
  }

  const user: User = {
    id: 1,
    name: "John",
    email: "john@example.com",
  };
  const userOption = newSome(user);
  const noUserOption = newNone();

  assert(isSome(userOption));
  assert(isNone(noUserOption));

  if (isSome(userOption)) {
    expect(userOption.body.id).toBe(1);
    expect(userOption.body.name).toBe("John");
    expect(userOption.body.email).toBe(
      "john@example.com",
    );
  }
});

test("Option with array bodys", () => {
  const numbers = [1, 2, 3, 4, 5];
  const arrayOption = newSome(numbers);
  const emptyArrayOption = newSome([]);
  const noneArrayOption = newNone();

  assert(isSome(arrayOption));
  assert(isSome(emptyArrayOption));
  assert(isNone(noneArrayOption));

  if (isSome(arrayOption)) {
    expect(arrayOption.body).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(arrayOption.body.length).toBe(5);
  }

  if (isSome(emptyArrayOption)) {
    expect(emptyArrayOption.body).toEqual([]);
    expect(emptyArrayOption.body.length).toBe(0);
  }
});

test("Option with boolean bodys", () => {
  const trueOption = newSome(true);
  const falseOption = newSome(false);
  const noneBoolOption = newNone();

  assert(isSome(trueOption));
  assert(isSome(falseOption));
  assert(isNone(noneBoolOption));

  if (isSome(trueOption)) {
    expect(trueOption.body).toBe(true);
  }

  if (isSome(falseOption)) {
    expect(falseOption.body).toBe(false);
  }
});

test("Option with zero bodys", () => {
  const zeroOption = newSome(0);
  const emptyStringOption = newSome("");

  assert(isSome(zeroOption));
  assert(isSome(emptyStringOption));

  if (isSome(zeroOption)) {
    expect(zeroOption.body).toBe(0);
  }

  if (isSome(emptyStringOption)) {
    expect(emptyStringOption.body).toBe("");
  }
});

test("Option Monad - map function", () => {
  const double = (x: number) => x * 2;
  const someNumber = newSome(5);
  const noneNumber = newNone();

  const r1 = pipe(someNumber, mapOption(double));
  const r2 = pipe(noneNumber, mapOption(double));

  assert(isSome(r1));
  expect(r1.body).toBe(10);
  assert(isNone(r2));
});

test("Option Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const someAdd3 = newSome(add(3));
  const someNumber = newSome(5);
  const noneAdd = newNone();
  const noneNumber = newNone();

  const r1 = pipe(
    someNumber,
    applyOption(someAdd3),
  );
  const r2 = pipe(
    someNumber,
    applyOption(noneAdd),
  );
  const r3 = pipe(
    noneNumber,
    applyOption(someAdd3),
  );
  const r4 = pipe(
    noneNumber,
    applyOption(noneAdd),
  );

  assert(isSome(r1));
  expect(r1.body).toBe(8);
  assert(isNone(r2));
  assert(isNone(r3));
  assert(isNone(r4));
});

test("Option Monad - of function", () => {
  const r1 = pipe(42, ofOption);
  const r2 = pipe("hello", ofOption);
  const r3 = pipe(null, ofOption);

  assert(isSome(r1));
  expect(r1.body).toBe(42);
  assert(isSome(r2));
  expect(r2.body).toBe("hello");
  assert(isSome(r3));
  expect(r3.body).toBe(null);
});

test("Option Monad - chain function", () => {
  const safeDivide =
    (y: number) =>
    (x: number): Option<number> =>
      y === 0 ? newNone() : newSome(x / y);

  const someNumber = newSome(10);
  const noneNumber = newNone();

  const r1 = pipe(
    someNumber,
    chainOption(safeDivide(2)),
  );
  const r2 = pipe(
    someNumber,
    chainOption(safeDivide(0)),
  );
  const r3 = pipe(
    noneNumber,
    chainOption(safeDivide(2)),
  );

  assert(isSome(r1));
  expect(r1.body).toBe(5);
  assert(isNone(r2));
  assert(isNone(r3));
});

test("Option Monad Laws - Left Identity", () => {
  const f = (x: number): Option<number> =>
    newSome(x * 2);
  const a = 5;

  const r1 = pipe(a, ofOption, chainOption(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("Option Monad Laws - Right Identity", () => {
  const m = newSome(42);

  const r1 = pipe(m, chainOption(ofOption));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("Option Monad Laws - Associativity", () => {
  const f = (x: number): Option<number> =>
    newSome(x + 1);
  const g = (x: number): Option<number> =>
    newSome(x * 2);
  const m = newSome(5);

  const r1 = pipe(
    m,
    chainOption(f),
    chainOption(g),
  );
  const r2 = pipe(
    m,
    chainOption((x: number) =>
      pipe(x, f, chainOption(g)),
    ),
  );

  expect(r1).toEqual(r2);
});

test("Option Functor Laws - Identity", () => {
  const opt = newSome(42);
  const identity = <T>(x: T) => x;

  const r1 = pipe(opt, mapOption(identity));

  expect(r1).toEqual(opt);
});

test("Option Functor Laws - Composition", () => {
  const opt = newSome(5);
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    opt,
    mapOption((x: number) => g(f(x))),
  );
  const r2 = pipe(
    opt,
    mapOption(f),
    mapOption(g),
  );

  expect(r1).toEqual(r2);
});

test("isOption - type guard for Option types", () => {
  // Test with Some values
  const someValue = newSome(42);
  expect(isOption(someValue)).toBe(true);

  const someString = newSome("hello");
  expect(isOption(someString)).toBe(true);

  // Test with None
  const noneValue = newNone();
  expect(isOption(noneValue)).toBe(true);

  // Test with non-Option values
  expect(isOption(42)).toBe(false);
  expect(isOption("string")).toBe(false);
  expect(isOption(null)).toBe(false);
  expect(isOption(undefined)).toBe(false);
  expect(isOption({})).toBe(false);
  expect(isOption([])).toBe(false);
});
