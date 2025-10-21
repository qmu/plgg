import { test, expect, assert } from "vitest";
import {
  Result,
  isMutVec,
  asMutVec,
  isOk,
  isErr,
  mapMutVec,
  applyMutVec,
  ofMutVec,
  chainMutVec,
  pipe,
  traverseMutVec,
  sequenceMutVec,
  foldrMutVec,
  foldlMutVec,
  mutVecApplicative,
  optionApplicative,
  newSome,
  newNone,
  isSome,
  isNone,
  concludeMutVec,
  newOk,
  newErr,
} from "plgg/index";

test("MutVec.is should return true for vectors", () => {
  expect(isMutVec([])).toBe(true);
  expect(isMutVec([1, 2, 3])).toBe(true);
  expect(isMutVec(["a", "b", "c"])).toBe(true);
  expect(isMutVec([1, "a", true, null])).toBe(
    true,
  );
  expect(isMutVec(new Array(5))).toBe(true);
  expect(
    isMutVec(
      Array.from({
        length: 3,
      }),
    ),
  ).toBe(true);
});

test("MutVec.is should return false for non-vectors", () => {
  expect(isMutVec(null)).toBe(false);
  expect(isMutVec(undefined)).toBe(false);
  expect(isMutVec({})).toBe(false);
  expect(isMutVec("vector")).toBe(false);
  expect(isMutVec(123)).toBe(false);
  expect(isMutVec(true)).toBe(false);
  expect(
    isMutVec({
      length: 0,
    }),
  ).toBe(false);
  expect(isMutVec("")).toBe(false);
});

test("MutVec.cast should succeed for vectors", () => {
  const result1 = asMutVec([]);
  assert(isOk(result1));
  expect(result1.content).toEqual([]);

  const result2 = asMutVec([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.content).toEqual([1, 2, 3]);

  const result3 = asMutVec(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.content).toEqual([
    "a",
    "b",
    "c",
  ]);

  const result4 = asMutVec([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.content).toEqual([
    1,
    "a",
    true,
    null,
  ]);
});

test("MutVec.cast should fail for non-vectors", () => {
  const result1 = asMutVec(null);
  assert(isErr(result1));
  expect(result1.content.message).toBe(
    "Value is not a vector",
  );

  const result2 = asMutVec(undefined);
  assert(isErr(result2));
  expect(result2.content.message).toBe(
    "Value is not a vector",
  );

  const result3 = asMutVec({});
  assert(isErr(result3));
  expect(result3.content.message).toBe(
    "Value is not a vector",
  );

  const result4 = asMutVec("vector");
  assert(isErr(result4));
  expect(result4.content.message).toBe(
    "Value is not a vector",
  );

  const result5 = asMutVec(123);
  assert(isErr(result5));
  expect(result5.content.message).toBe(
    "Value is not a vector",
  );
});

test("MutVec Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapMutVec(double));
  const r2 = pipe([1, 2, 3], mapMutVec(double));
  const r3 = pipe([1, 2, 3], mapMutVec(toString));

  expect(r1).toEqual([]);
  expect(r2).toEqual([2, 4, 6]);
  expect(r3).toEqual(["1", "2", "3"]);
});

test("MutVec Monad - of function", () => {
  const r1 = pipe(1, ofMutVec);
  const r2 = pipe("hello", ofMutVec);
  const r3 = pipe(null, ofMutVec);

  expect(r1).toEqual([1]);
  expect(r2).toEqual(["hello"]);
  expect(r3).toEqual([null]);
});

test("MutVec Monad - chain function (flatMap)", () => {
  const duplicate = (x: number) => [x, x];
  const range = (n: number) =>
    Array.from({ length: n }, (_, i) => i);

  const r1 = pipe([], chainMutVec(duplicate));
  const r2 = pipe(
    [1, 2, 3],
    chainMutVec(duplicate),
  );
  const r3 = pipe([2, 3, 1], chainMutVec(range));

  expect(r1).toEqual([]);
  expect(r2).toEqual([1, 1, 2, 2, 3, 3]);
  expect(r3).toEqual([0, 1, 0, 1, 2, 0]);
});

test("MutVec Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const multiply = (x: number) => (y: number) =>
    x * y;
  const curryConcat =
    (a: string) => (b: string) =>
      a + b;

  const r1 = pipe(
    [1, 2],
    applyMutVec([add(1), multiply(2)]),
  );
  const r2 = pipe([], applyMutVec([add(0)]));
  const r3 = pipe([1, 2], applyMutVec([]));
  const r4 = pipe(
    ["world", "there"],
    applyMutVec([
      curryConcat("hello "),
      curryConcat("hi "),
    ]),
  );

  expect(r1).toEqual([2, 3, 2, 4]);
  expect(r2).toEqual([]);
  expect(r3).toEqual([]);
  expect(r4).toEqual([
    "hello world",
    "hello there",
    "hi world",
    "hi there",
  ]);
});

test("MutVec Monad Laws - Left Identity", () => {
  const f = (x: number) => [x, x * 2];
  const a = 5;

  const r1 = pipe(a, ofMutVec, chainMutVec(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("MutVec Monad Laws - Right Identity", () => {
  const m = [1, 2, 3];

  const r1 = pipe(m, chainMutVec(ofMutVec));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("MutVec Monad Laws - Associativity", () => {
  const f = (x: number) => [x, x + 1];
  const g = (x: number) => [x * 2];
  const m = [1, 2];

  const r1 = pipe(
    m,
    chainMutVec(f),
    chainMutVec(g),
  );
  const r2 = pipe(
    m,
    chainMutVec((x: number) =>
      pipe(x, f, chainMutVec(g)),
    ),
  );

  expect(r1).toEqual(r2);
});

test("MutVec Functor Laws - Identity", () => {
  const vec = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(vec, mapMutVec(identity));

  expect(r1).toEqual(vec);
});

test("MutVec Functor Laws - Composition", () => {
  const vec = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    vec,
    mapMutVec((x: number) => g(f(x))),
  );
  const r2 = pipe(
    vec,
    mapMutVec(f),
    mapMutVec(g),
  );

  expect(r1).toEqual(r2);
});

test("MutVec Foldable - foldr function", () => {
  const add = (x: number, acc: number) => x + acc;
  const concat = (x: string, acc: string) =>
    x + acc;

  const r1 = pipe([], foldrMutVec(add)(0));
  const r2 = pipe([1, 2, 3], foldrMutVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldrMutVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("MutVec Foldable - foldl function", () => {
  const add = (acc: number, x: number) => acc + x;
  const concat = (acc: string, x: string) =>
    acc + x;

  const r1 = pipe([], foldlMutVec(add)(0));
  const r2 = pipe([1, 2, 3], foldlMutVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldlMutVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("MutVec Traversable - traverse with MutVec", () => {
  const choices = (x: number) => [x, x + 10]; // gives each number two choices

  const r1 = pipe(
    [],
    traverseMutVec(mutVecApplicative)(choices),
  );
  expect(r1).toEqual([[]]);

  // For [1, 2] with choices (x => [x, x + 10]):
  // choices(1) = [1, 11], choices(2) = [2, 12]
  // traverse should give all combinations:
  // [1, 2], [1, 12], [11, 2], [11, 12]
  const r2 = pipe(
    [1, 2],
    traverseMutVec(mutVecApplicative)(choices),
  );
  expect(r2).toEqual([
    [1, 2],
    [1, 12],
    [11, 2],
    [11, 12],
  ]);
});

test("MutVec Traversable - sequence with MutVec", () => {
  const r1 = pipe(
    [
      [1, 2],
      [3, 4],
    ],
    sequenceMutVec(mutVecApplicative),
  );
  expect(r1).toEqual([
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ]);

  const r2 = pipe(
    [],
    sequenceMutVec(mutVecApplicative),
  );
  expect(r2).toEqual([[]]);

  const r3 = pipe(
    [[]],
    sequenceMutVec(mutVecApplicative),
  );
  expect(r3).toEqual([]);
});

test("MutVec Traversable - collect results with Option (safe division)", () => {
  // Function that safely divides 10 by n, failing for zero or negative numbers
  const safeDivide = (n: number) =>
    n > 0 ? newSome(10 / n) : newNone();

  // Success case: all divisions succeed, results collected into Some([...])
  const r1 = pipe(
    [1, 2, 5],
    traverseMutVec(optionApplicative)(safeDivide),
  );
  assert(isSome(r1));
  expect(r1.content).toEqual([10, 5, 2]);

  // Failure case: one division fails, entire traversal fails with None
  const r2 = pipe(
    [1, 0, 5],
    traverseMutVec(optionApplicative)(safeDivide),
  );
  assert(isNone(r2));

  // Edge case: empty vector always succeeds
  const r3 = pipe(
    [],
    traverseMutVec(optionApplicative)(safeDivide),
  );
  assert(isSome(r3));
  expect(r3.content).toEqual([]);
});

test("concludeMutVec - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, string> => {
    const num = Number(s);
    return isNaN(num)
      ? newErr("Invalid number")
      : newOk(num);
  };

  const r1 = pipe(
    [],
    concludeMutVec(parseNumber),
  );
  assert(isOk(r1));
  expect(r1.content).toEqual([]);

  const r2 = pipe(
    ["1", "2", "3"],
    concludeMutVec(parseNumber),
  );
  assert(isOk(r2));
  expect(r2.content).toEqual([1, 2, 3]);

  const r3 = pipe(
    ["42", "3.14", "0"],
    concludeMutVec(parseNumber),
  );
  assert(isOk(r3));
  expect(r3.content).toEqual([42, 3.14, 0]);
});

test("concludeMutVec - failure case with errors collected", () => {
  const parsePositiveNumber = (
    s: string,
  ): Result<number, string> => {
    const num = Number(s);
    if (isNaN(num)) {
      return newErr("Invalid number: " + s);
    }
    if (num <= 0) {
      return newErr("Non-positive number: " + s);
    }
    return newOk(num);
  };

  const r1 = pipe(
    ["invalid"],
    concludeMutVec(parsePositiveNumber),
  );
  assert(isErr(r1));
  expect(r1.content).toEqual([
    "Invalid number: invalid",
  ]);

  const r2 = pipe(
    ["1", "invalid", "3"],
    concludeMutVec(parsePositiveNumber),
  );
  assert(isErr(r2));
  expect(r2.content).toEqual([
    "Invalid number: invalid",
  ]);

  const r3 = pipe(
    ["-1", "invalid", "0"],
    concludeMutVec(parsePositiveNumber),
  );
  assert(isErr(r3));
  expect(r3.content).toEqual([
    "Non-positive number: -1",
    "Invalid number: invalid",
    "Non-positive number: 0",
  ]);
});

/**
 * Verifies traverseMutVec function is exported and available.
 */
test("traverseMutVec - function exists", () => {
  // Verify traverse function availability for mutable vector operations
  expect(typeof traverseMutVec).toBe("function");
  expect(traverseMutVec).toBeDefined();
});

/**
 * Verifies sequenceMutVec function is exported and available.
 */
test("sequenceMutVec - function exists", () => {
  // Verify sequence function availability for mutable vector operations
  expect(typeof sequenceMutVec).toBe("function");
  expect(sequenceMutVec).toBeDefined();
});
