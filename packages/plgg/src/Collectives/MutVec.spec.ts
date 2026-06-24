import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
  someThen,
} from "plgg-test";
import {
  Result,
  isMutVec,
  asMutVec,
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
  some,
  none,
  isNone,
  concludeMutVec,
  ok,
  err,
} from "plgg/index";

test("MutVec.is should return true for vectors", () =>
  all([
    check(isMutVec([]), toBe(true)),
    check(isMutVec([1, 2, 3]), toBe(true)),
    check(
      isMutVec(["a", "b", "c"]),
      toBe(true),
    ),
    check(
      isMutVec([1, "a", true, null]),
      toBe(true),
    ),
    check(isMutVec(new Array(5)), toBe(true)),
    check(
      isMutVec(Array.from({ length: 3 })),
      toBe(true),
    ),
  ]));

test("MutVec.is should return false for non-vectors", () =>
  all([
    check(isMutVec(null), toBe(false)),
    check(isMutVec(undefined), toBe(false)),
    check(isMutVec({}), toBe(false)),
    check(isMutVec("vector"), toBe(false)),
    check(isMutVec(123), toBe(false)),
    check(isMutVec(true), toBe(false)),
    check(
      isMutVec({ length: 0 }),
      toBe(false),
    ),
    check(isMutVec(""), toBe(false)),
  ]));

test("MutVec.cast should succeed for vectors", () =>
  all([
    check(asMutVec([]), okThen(toEqual([]))),
    check(
      asMutVec([1, 2, 3]),
      okThen(toEqual([1, 2, 3])),
    ),
    check(
      asMutVec(["a", "b", "c"]),
      okThen(toEqual(["a", "b", "c"])),
    ),
    check(
      asMutVec([1, "a", true, null]),
      okThen(toEqual([1, "a", true, null])),
    ),
  ]));

test("MutVec.cast should fail for non-vectors", () =>
  all([
    check(
      asMutVec(null),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asMutVec(undefined),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asMutVec({}),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asMutVec("vector"),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
    check(
      asMutVec(123),
      errThen((e) =>
        toBe("Value is not a vector")(
          e.content.message,
        ),
      ),
    ),
  ]));

test("MutVec Monad - map function", () => {
  const double = (x: number) => x * 2;
  const toString = (x: number) => x.toString();

  const r1 = pipe([], mapMutVec(double));
  const r2 = pipe([1, 2, 3], mapMutVec(double));
  const r3 = pipe([1, 2, 3], mapMutVec(toString));

  return all([
    check(r1, toEqual([])),
    check(r2, toEqual([2, 4, 6])),
    check(r3, toEqual(["1", "2", "3"])),
  ]);
});

test("MutVec Monad - of function", () => {
  const r1 = pipe(1, ofMutVec);
  const r2 = pipe("hello", ofMutVec);
  const r3 = pipe(null, ofMutVec);

  return all([
    check(r1, toEqual([1])),
    check(r2, toEqual(["hello"])),
    check(r3, toEqual([null])),
  ]);
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

  return all([
    check(r1, toEqual([])),
    check(r2, toEqual([1, 1, 2, 2, 3, 3])),
    check(r3, toEqual([0, 1, 0, 1, 2, 0])),
  ]);
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

  return all([
    check(r1, toEqual([2, 3, 2, 4])),
    check(r2, toEqual([])),
    check(r3, toEqual([])),
    check(
      r4,
      toEqual([
        "hello world",
        "hello there",
        "hi world",
        "hi there",
      ]),
    ),
  ]);
});

test("MutVec Monad Laws - Left Identity", () => {
  const f = (x: number) => [x, x * 2];
  const a = 5;

  const r1 = pipe(a, ofMutVec, chainMutVec(f));
  const r2 = f(a);

  return check(r1, toEqual(r2));
});

test("MutVec Monad Laws - Right Identity", () => {
  const m = [1, 2, 3];

  const r1 = pipe(m, chainMutVec(ofMutVec));
  const r2 = m;

  return check(r1, toEqual(r2));
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

  return check(r1, toEqual(r2));
});

test("MutVec Functor Laws - Identity", () => {
  const vec = [1, 2, 3];
  const identity = <T>(x: T) => x;

  const r1 = pipe(vec, mapMutVec(identity));

  return check(r1, toEqual(vec));
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

  return check(r1, toEqual(r2));
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

  return all([
    check(r1, toBe(0)),
    check(r2, toBe(6)),
    check(r3, toBe("abc")),
  ]);
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

  return all([
    check(r1, toBe(0)),
    check(r2, toBe(6)),
    check(r3, toBe("abc")),
  ]);
});

test("MutVec Traversable - traverse with MutVec", () => {
  const choices = (x: number) => [x, x + 10]; // gives each number two choices

  const r1 = pipe(
    [],
    traverseMutVec(mutVecApplicative)(choices),
  );

  // For [1, 2] with choices (x => [x, x + 10]):
  // choices(1) = [1, 11], choices(2) = [2, 12]
  // traverse should give all combinations:
  // [1, 2], [1, 12], [11, 2], [11, 12]
  const r2 = pipe(
    [1, 2],
    traverseMutVec(mutVecApplicative)(choices),
  );

  return all([
    check(r1, toEqual([[]])),
    check(
      r2,
      toEqual([
        [1, 2],
        [1, 12],
        [11, 2],
        [11, 12],
      ]),
    ),
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

  const r2 = pipe(
    [],
    sequenceMutVec(mutVecApplicative),
  );

  const r3 = pipe(
    [[]],
    sequenceMutVec(mutVecApplicative),
  );

  return all([
    check(
      r1,
      toEqual([
        [1, 3],
        [1, 4],
        [2, 3],
        [2, 4],
      ]),
    ),
    check(r2, toEqual([[]])),
    check(r3, toEqual([])),
  ]);
});

test("MutVec Traversable - collect results with Option (safe division)", () => {
  // Function that safely divides 10 by n, failing for zero or negative numbers
  const safeDivide = (n: number) =>
    n > 0 ? some(10 / n) : none();

  // Success case: all divisions succeed, results collected into Some([...])
  const r1 = pipe(
    [1, 2, 5],
    traverseMutVec(optionApplicative)(safeDivide),
  );

  // Failure case: one division fails, entire traversal fails with None
  const r2 = pipe(
    [1, 0, 5],
    traverseMutVec(optionApplicative)(safeDivide),
  );

  // Edge case: empty vector always succeeds
  const r3 = pipe(
    [],
    traverseMutVec(optionApplicative)(safeDivide),
  );

  return all([
    check(r1, someThen(toEqual([10, 5, 2]))),
    check(isNone(r2), toBe(true)),
    check(r3, someThen(toEqual([]))),
  ]);
});

test("concludeMutVec - success case with all valid results", () => {
  const parseNumber = (
    s: string,
  ): Result<number, string> => {
    const num = Number(s);
    return isNaN(num)
      ? err("Invalid number")
      : ok(num);
  };

  const r1 = pipe(
    [],
    concludeMutVec(parseNumber),
  );

  const r2 = pipe(
    ["1", "2", "3"],
    concludeMutVec(parseNumber),
  );

  const r3 = pipe(
    ["42", "3.14", "0"],
    concludeMutVec(parseNumber),
  );

  return all([
    check(r1, okThen(toEqual([]))),
    check(r2, okThen(toEqual([1, 2, 3]))),
    check(r3, okThen(toEqual([42, 3.14, 0]))),
  ]);
});

test("concludeMutVec - failure case with errors collected", () => {
  const parsePositiveNumber = (
    s: string,
  ): Result<number, string> => {
    const num = Number(s);
    if (isNaN(num)) {
      return err("Invalid number: " + s);
    }
    if (num <= 0) {
      return err("Non-positive number: " + s);
    }
    return ok(num);
  };

  const r1 = pipe(
    ["invalid"],
    concludeMutVec(parsePositiveNumber),
  );

  const r2 = pipe(
    ["1", "invalid", "3"],
    concludeMutVec(parsePositiveNumber),
  );

  const r3 = pipe(
    ["-1", "invalid", "0"],
    concludeMutVec(parsePositiveNumber),
  );

  return all([
    check(
      r1,
      errThen(
        toEqual(["Invalid number: invalid"]),
      ),
    ),
    check(
      r2,
      errThen(
        toEqual(["Invalid number: invalid"]),
      ),
    ),
    check(
      r3,
      errThen(
        toEqual([
          "Non-positive number: -1",
          "Invalid number: invalid",
          "Non-positive number: 0",
        ]),
      ),
    ),
  ]);
});

/**
 * Verifies traverseMutVec function is exported and available.
 */
test("traverseMutVec - function exists", () =>
  // Verify traverse function availability for mutable vector operations
  all([
    check(
      typeof traverseMutVec,
      toBe("function"),
    ),
    check(
      traverseMutVec !== undefined,
      toBe(true),
    ),
  ]));

/**
 * Verifies sequenceMutVec function is exported and available.
 */
test("sequenceMutVec - function exists", () =>
  // Verify sequence function availability for mutable vector operations
  all([
    check(
      typeof sequenceMutVec,
      toBe("function"),
    ),
    check(
      sequenceMutVec !== undefined,
      toBe(true),
    ),
  ]));
