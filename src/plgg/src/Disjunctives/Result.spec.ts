import { test, expect, assert } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  isResult,
  Result,
  InvalidError,
  chainResult,
  mapResult,
  applyResult,
  ofResult,
  pipe,
} from "plgg/index";

test("ok creates Ok result", () => {
  const result = ok(42);
  expect(result.__tag).toBe("Ok");
  assert(isOk(result));
  if (isOk(result)) {
    expect(result.content).toBe(42);
  }
});

test("err creates Err result", () => {
  const result = err("error message");
  expect(result.__tag).toBe("Err");
  assert(isErr(result));
  if (isErr(result)) {
    expect(result.content).toBe("error message");
  }
});

test("isOk identifies Ok results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(isOk(okResult));
  assert(!isOk(errResult));
});

test("isErr identifies Err results", () => {
  const okResult = ok("success");
  const errResult = err("failure");

  assert(!isErr(okResult));
  assert(isErr(errResult));
});

test("isResult identifies Result types", () => {
  const okResult = ok(123);
  const errResult = err("error");
  const notResult = { random: "object" };
  const nullValue = null;
  const undefinedValue = undefined;

  assert(isResult(okResult));
  assert(isResult(errResult));
  assert(!isResult(notResult));
  assert(!isResult(nullValue));
  assert(!isResult(undefinedValue));
});

test("Result can handle different types", () => {
  const stringResult: Result<string, number> = ok("hello");
  const numberErrorResult: Result<string, number> = err(404);

  assert(isOk(stringResult));
  assert(isErr(numberErrorResult));

  if (isOk(stringResult)) {
    expect(stringResult.content).toBe("hello");
  }

  if (isErr(numberErrorResult)) {
    expect(numberErrorResult.content).toBe(404);
  }
});

test("mapOk transforms success values while preserving errors", () => {
  // Example: Processing successful API responses
  const formatPrice = (price: number): Result<string, Error> =>
    ok(`$${price.toFixed(2)}`);

  const successResult = chainResult(formatPrice)(ok(29.99));
  assert(isOk(successResult));
  expect(successResult.content).toBe("$29.99");

  const priceError = new InvalidError({ message: "Invalid price" });
  const e = err(priceError);
  const errorResult = chainResult(formatPrice)(e);
  assert(isErr(errorResult));
  expect(errorResult.content.message).toBe("Invalid price");
});

test("Result Monad - map function", () => {
  const double = (x: number) => x * 2;
  const okValue = ok(5);
  const errValue = err("error");

  const r1 = pipe(okValue, mapResult(double));
  const r2 = pipe(errValue, mapResult(double));

  assert(isOk(r1));
  expect(r1.content).toBe(10);
  assert(isErr(r2));
  expect(r2.content).toBe("error");
});

test("Result Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const okAdd3: Result<(y: number) => number, string> = ok(add(3));
  const okNumber: Result<number, string> = ok(5);
  const errFunction: Result<(y: number) => number, string> =
    err("function error");
  const errValue: Result<number, string> = err("value error");

  const r1 = pipe(okNumber, applyResult(okAdd3));
  const r2 = pipe(okNumber, applyResult(errFunction));
  const r3 = pipe(errValue, applyResult<number, number, string>(okAdd3));
  const r4 = pipe(errValue, applyResult(errFunction));

  assert(isOk(r1));
  expect(r1.content).toBe(8);
  assert(isErr(r2));
  expect(r2.content).toBe("function error");
  assert(isErr(r3));
  expect(r3.content).toBe("value error");
  assert(isErr(r4));
  expect(r4.content).toBe("function error");
});

test("Result Monad - of function", () => {
  const r1 = pipe(42, ofResult);
  const r2 = pipe("hello", ofResult);
  const r3 = pipe(null, ofResult);

  assert(isOk(r1));
  expect(r1.content).toBe(42);
  assert(isOk(r2));
  expect(r2.content).toBe("hello");
  assert(isOk(r3));
  expect(r3.content).toBe(null);
});

test("Result Monad - chain function", () => {
  const safeDivide =
    (y: number) =>
    (x: number): Result<number, string> =>
      y === 0 ? err("Division by zero") : ok(x / y);

  const okNumber = ok(10);
  const errNumber = err("Invalid number");

  const r1 = pipe(okNumber, chainResult(safeDivide(2)));
  const r2 = pipe(okNumber, chainResult(safeDivide(0)));
  const r3 = pipe(errNumber, chainResult(safeDivide(2)));

  assert(isOk(r1));
  expect(r1.content).toBe(5);
  assert(isErr(r2));
  expect(r2.content).toBe("Division by zero");
  assert(isErr(r3));
  expect(r3.content).toBe("Invalid number");
});

test("Result Monad Laws - Left Identity", () => {
  const f = (x: number): Result<number, string> => ok(x * 2);
  const a = 5;

  const r1 = pipe(a, ofResult, chainResult(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("Result Monad Laws - Right Identity", () => {
  const m = ok(42);

  const r1 = pipe(m, chainResult(ofResult));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("Result Monad Laws - Associativity", () => {
  const f = (x: number): Result<number, string> => ok(x + 1);
  const g = (x: number): Result<number, string> => ok(x * 2);
  const m = ok(5);

  const r1 = pipe(m, chainResult(f), chainResult(g));
  const r2 = pipe(
    m,
    chainResult((x: number) => pipe(x, f, chainResult(g))),
  );

  expect(r1).toEqual(r2);
});

test("Result Functor Laws - Identity", () => {
  const res = ok(42);
  const identity = <T>(x: T) => x;

  const r1 = pipe(res, mapResult(identity));

  expect(r1).toEqual(res);
});

test("Result Functor Laws - Composition", () => {
  const res = ok(5);
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    res,
    mapResult((x: number) => g(f(x))),
  );
  const r2 = pipe(res, mapResult(f), mapResult(g));

  expect(r1).toEqual(r2);
});
