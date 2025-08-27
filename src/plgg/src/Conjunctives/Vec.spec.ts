import { test, expect, assert } from "vitest";
import {
  isVec,
  asVec,
  isOk,
  isErr,
  mapVec,
  applyVec,
  ofVec,
  chainVec,
  pipe,
  traverseVec,
  sequenceVec,
  foldrVec,
  foldlVec,
  vecApplicative,
  optionApplicative,
  newSome,
  newNone,
  isSome,
  isNone,
  conclude,
  newOk,
  newErr,
  Result,
} from "plgg/index";

test("Vec.is should return true for vectors", () => {
  expect(isVec([])).toBe(true);
  expect(isVec([1, 2, 3])).toBe(true);
  expect(isVec(["a", "b", "c"])).toBe(true);
  expect(isVec([1, "a", true, null])).toBe(true);
  expect(isVec(new Array(5))).toBe(true);
  expect(
    isVec(
      Array.from({
        length: 3,
      }),
    ),
  ).toBe(true);
});

test("Vec.is should return false for non-vectors", () => {
  expect(isVec(null)).toBe(false);
  expect(isVec(undefined)).toBe(false);
  expect(isVec({})).toBe(false);
  expect(isVec("vector")).toBe(false);
  expect(isVec(123)).toBe(false);
  expect(isVec(true)).toBe(false);
  expect(
    isVec({
      length: 0,
    }),
  ).toBe(false);
  expect(isVec("")).toBe(false);
});

test("Vec.cast should succeed for vectors", () => {
  const result1 = asVec([]);
  assert(isOk(result1));
  expect(result1.body).toEqual([]);

  const result2 = asVec([1, 2, 3]);
  assert(isOk(result2));
  expect(result2.body).toEqual([1, 2, 3]);

  const result3 = asVec(["a", "b", "c"]);
  assert(isOk(result3));
  expect(result3.body).toEqual(["a", "b", "c"]);

  const result4 = asVec([1, "a", true, null]);
  assert(isOk(result4));
  expect(result4.body).toEqual([
    1,
    "a",
    true,
    null,
  ]);
});

test("Vec.cast should fail for non-vectors", () => {
  const result1 = asVec(null);
  assert(isErr(result1));
  expect(result1.body.message).toBe(
    "Value is not a vector",
  );

  const result2 = asVec(undefined);
  assert(isErr(result2));
  expect(result2.body.message).toBe(
    "Value is not a vector",
  );

  const result3 = asVec({});
  assert(isErr(result3));
  expect(result3.body.message).toBe(
    "Value is not a vector",
  );

  const result4 = asVec("vector");
  assert(isErr(result4));
  expect(result4.body.message).toBe(
    "Value is not a vector",
  );

  const result5 = asVec(123);
  assert(isErr(result5));
  expect(result5.body.message).toBe(
    "Value is not a vector",
  );
});

test("Vec Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapVec(double));
  const r2 = pipe([1, 2, 3], mapVec(double));
  const r3 = pipe([1, 2, 3], mapVec(toString));

  expect(r1).toEqual([]);
  expect(r2).toEqual([2, 4, 6]);
  expect(r3).toEqual(["1", "2", "3"]);
});

test("Vec Monad - of function", () => {
  const r1 = pipe(1, ofVec);
  const r2 = pipe("hello", ofVec);
  const r3 = pipe(null, ofVec);

  expect(r1).toEqual([1]);
  expect(r2).toEqual(["hello"]);
  expect(r3).toEqual([null]);
});

test("Vec Monad - chain function (flatMap)", () => {
  const duplicate = (x: number) => [x, x];
  const range = (n: number) =>
    Array.from({ length: n }, (_, i) => i);

  const r1 = pipe([], chainVec(duplicate));
  const r2 = pipe([1, 2, 3], chainVec(duplicate));
  const r3 = pipe([2, 3, 1], chainVec(range));

  expect(r1).toEqual([]);
  expect(r2).toEqual([1, 1, 2, 2, 3, 3]);
  expect(r3).toEqual([0, 1, 0, 1, 2, 0]);
});

test("Vec Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const multiply = (x: number) => (y: number) =>
    x * y;
  const curryConcat =
    (a: string) => (b: string) =>
      a + b;

  const r1 = pipe(
    [1, 2],
    applyVec([add(1), multiply(2)]),
  );
  const r2 = pipe([], applyVec([add(0)]));
  const r3 = pipe([1, 2], applyVec([]));
  const r4 = pipe(
    ["world", "there"],
    applyVec([
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

test("Vec Monad Laws - Left Identity", () => {
  const f = (x: number) => [x, x * 2];
  const a = 5;

  const r1 = pipe(a, ofVec, chainVec(f));
  const r2 = f(a);

  expect(r1).toEqual(r2);
});

test("Vec Monad Laws - Right Identity", () => {
  const m = [1, 2, 3];

  const r1 = pipe(m, chainVec(ofVec));
  const r2 = m;

  expect(r1).toEqual(r2);
});

test("Vec Monad Laws - Associativity", () => {
  const f = (x: number) => [x, x + 1];
  const g = (x: number) => [x * 2];
  const m = [1, 2];

  const r1 = pipe(m, chainVec(f), chainVec(g));
  const r2 = pipe(
    m,
    chainVec((x: number) =>
      pipe(x, f, chainVec(g)),
    ),
  );

  expect(r1).toEqual(r2);
});

test("Vec Functor Laws - Identity", () => {
  const vec = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(vec, mapVec(identity));

  expect(r1).toEqual(vec);
});

test("Vec Functor Laws - Composition", () => {
  const vec = [1, 2, 3];
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    vec,
    mapVec((x: number) => g(f(x))),
  );
  const r2 = pipe(vec, mapVec(f), mapVec(g));

  expect(r1).toEqual(r2);
});

test("Vec Foldable - foldr function", () => {
  const add = (x: number, acc: number) => x + acc;
  const concat = (x: string, acc: string) =>
    x + acc;

  const r1 = pipe([], foldrVec(add)(0));
  const r2 = pipe([1, 2, 3], foldrVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldrVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("Vec Foldable - foldl function", () => {
  const add = (acc: number, x: number) => acc + x;
  const concat = (acc: string, x: string) =>
    acc + x;

  const r1 = pipe([], foldlVec(add)(0));
  const r2 = pipe([1, 2, 3], foldlVec(add)(0));
  const r3 = pipe(
    ["a", "b", "c"],
    foldlVec(concat)(""),
  );

  expect(r1).toBe(0);
  expect(r2).toBe(6);
  expect(r3).toBe("abc");
});

test("Vec Traversable - traverse with Vector", () => {
  const choices = (x: number) => [x, x + 10]; // gives each number two choices

  const r1 = pipe(
    [],
    traverseVec(vecApplicative)(choices),
  );
  expect(r1).toEqual([[]]);

  // For [1, 2] with choices (x => [x, x + 10]):
  // choices(1) = [1, 11], choices(2) = [2, 12]
  // traverse should give all combinations:
  // [1, 2], [1, 12], [11, 2], [11, 12]
  const r2 = pipe(
    [1, 2],
    traverseVec(vecApplicative)(choices),
  );
  expect(r2).toEqual([
    [1, 2],
    [1, 12],
    [11, 2],
    [11, 12],
  ]);
});

test("Vec Traversable - sequence with Vector", () => {
  const r1 = pipe(
    [
      [1, 2],
      [3, 4],
    ],
    sequenceVec(vecApplicative),
  );
  expect(r1).toEqual([
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
  ]);

  const r2 = pipe(
    [],
    sequenceVec(vecApplicative),
  );
  expect(r2).toEqual([[]]);

  const r3 = pipe(
    [[]],
    sequenceVec(vecApplicative),
  );
  expect(r3).toEqual([]);
});

test("Vec Traversable - collect results with Option (safe division)", () => {
  // Function that safely divides 10 by n, failing for zero or negative numbers
  const safeDivide = (n: number) =>
    n > 0 ? newSome(10 / n) : newNone();

  // Success case: all divisions succeed, results collected into Some([...])
  const r1 = pipe(
    [1, 2, 5],
    traverseVec(optionApplicative)(safeDivide),
  );
  assert(isSome(r1));
  expect(r1.body).toEqual([10, 5, 2]);

  // Failure case: one division fails, entire traversal fails with None
  const r2 = pipe(
    [1, 0, 5],
    traverseVec(optionApplicative)(safeDivide),
  );
  assert(isNone(r2));

  // Edge case: empty vector always succeeds
  const r3 = pipe(
    [],
    traverseVec(optionApplicative)(safeDivide),
  );
  assert(isSome(r3));
  expect(r3.body).toEqual([]);
});

test("Vec Traversable - collect results with Option (validation)", () => {
  // Function that validates and parses positive numbers from strings
  const parsePositive = (s: string) => {
    const num = Number(s);
    return isNaN(num) || num <= 0
      ? newNone()
      : newSome(num);
  };

  // Success case: all strings are valid positive numbers
  const r1 = pipe(
    ["1", "2.5", "42"],
    traverseVec(optionApplicative)(parsePositive),
  );
  assert(isSome(r1));
  expect(r1.body).toEqual([1, 2.5, 42]);

  // Failure case: invalid number in vector causes entire validation to fail
  const r2 = pipe(
    ["1", "invalid", "42"],
    traverseVec(optionApplicative)(parsePositive),
  );
  assert(isNone(r2));

  // Failure case: negative number causes validation to fail
  const r3 = pipe(
    ["1", "-5", "42"],
    traverseVec(optionApplicative)(parsePositive),
  );
  assert(isNone(r3));

  // Failure case: zero causes validation to fail (not positive)
  const r4 = pipe(
    ["1", "0", "42"],
    traverseVec(optionApplicative)(parsePositive),
  );
  assert(isNone(r4));
});

test("Vec Traversable - empty vector edge cases", () => {
  // Empty vectors should always succeed regardless of the effectful function
  const alwaysFails = (_: unknown) => newNone();
  const maybeSucceeds = (x: number) =>
    x > 0 ? newSome(x * 2) : newNone();

  // Even functions that always fail should succeed on empty vectors
  const r1 = pipe(
    [],
    traverseVec(optionApplicative)(alwaysFails),
  );
  assert(isSome(r1));
  expect(r1.body).toEqual([]);

  // Functions that might succeed should also work on empty vectors
  const r2 = pipe(
    [],
    traverseVec(optionApplicative)(maybeSucceeds),
  );
  assert(isSome(r2));
  expect(r2.body).toEqual([]);

  // This demonstrates that traverse respects the Applicative identity:
  // traverse(f, []) === pure([]) for any function f
});

test("conclude - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, string> => {
    const num = Number(s);
    return isNaN(num)
      ? newErr("Invalid number")
      : newOk(num);
  };

  const r1 = pipe([], conclude(parseNumber));
  assert(isOk(r1));
  expect(r1.body).toEqual([]);

  const r2 = pipe(
    ["1", "2", "3"],
    conclude(parseNumber),
  );
  assert(isOk(r2));
  expect(r2.body).toEqual([1, 2, 3]);

  const r3 = pipe(
    ["42", "3.14", "0"],
    conclude(parseNumber),
  );
  assert(isOk(r3));
  expect(r3.body).toEqual([42, 3.14, 0]);
});

test("conclude - failure case with first error returned", () => {
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
    conclude(parsePositiveNumber),
  );
  assert(isErr(r1));
  expect(r1.body).toEqual([
    "Invalid number: invalid",
  ]);

  const r2 = pipe(
    ["1", "invalid", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r2));
  expect(r2.body).toEqual([
    "Invalid number: invalid",
  ]);

  const r3 = pipe(
    ["1", "-5", "3"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r3));
  expect(r3.body).toEqual([
    "Non-positive number: -5",
  ]);

  const r4 = pipe(
    ["-1", "invalid", "0"],
    conclude(parsePositiveNumber),
  );
  assert(isErr(r4));
  expect(r4.body).toEqual([
    "Non-positive number: -1",
    "Invalid number: invalid",
    "Non-positive number: 0",
  ]);
});

test("conclude - mixed types transformation", () => {
  const processValue = (
    x: number,
  ): Result<string, string> => {
    if (x < 0) {
      return newErr("Negative value not allowed");
    }
    if (x === 0) {
      return newOk("zero");
    }
    if (x === 1) {
      return newOk("one");
    }
    return newOk(`number: ${x}`);
  };

  const r1 = pipe(
    [0, 1, 2, 10],
    conclude(processValue),
  );
  assert(isOk(r1));
  expect(r1.body).toEqual([
    "zero",
    "one",
    "number: 2",
    "number: 10",
  ]);

  const r2 = pipe(
    [1, -1, 2],
    conclude(processValue),
  );
  assert(isErr(r2));
  expect(r2.body).toEqual([
    "Negative value not allowed",
  ]);
});

test("conclude - processes all elements but returns first error", () => {
  let callCount = 0;
  const trackingFunction = (
    x: number,
  ): Result<number, string> => {
    callCount++;
    if (x === 2) {
      return newErr("Error at 2");
    }
    return newOk(x * 10);
  };

  callCount = 0;
  const r1 = pipe(
    [1, 2, 3, 4],
    conclude(trackingFunction),
  );
  assert(isErr(r1));
  expect(r1.body).toEqual(["Error at 2"]);
  expect(callCount).toBe(4);

  callCount = 0;
  const r2 = pipe(
    [1, 3, 4],
    conclude(trackingFunction),
  );
  assert(isOk(r2));
  expect(r2.body).toEqual([10, 30, 40]);
  expect(callCount).toBe(3);
});
