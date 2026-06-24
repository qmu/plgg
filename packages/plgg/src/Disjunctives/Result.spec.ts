import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
} from "plgg-test";
import {
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  isOk,
  isErr,
  isResult,
  chainResult,
  mapResult,
  mapErr,
  matchResult,
  applyResult,
  ofResult,
  pipe,
  traverseResult,
  sequenceResult,
  foldrResult,
  foldlResult,
  optionApplicative,
  some,
  none,
  isNone,
} from "plgg/index";

test("ok creates Ok result", () => {
  const result = ok(42);
  return all([
    check(result.__tag, toBe("Ok")),
    check(result, okThen(toBe(42))),
  ]);
});

test("err creates Err result", () => {
  const result = err("error message");
  return all([
    check(result.__tag, toBe("Err")),
    check(result, errThen(toBe("error message"))),
  ]);
});

test("isOk identifies Ok results", () => {
  const okResult = ok("success");
  const errResult = err("failure");
  return all([
    check(isOk(okResult), toBe(true)),
    check(isOk(errResult), toBe(false)),
  ]);
});

test("isErr identifies Err results", () => {
  const okResult = ok("success");
  const errResult = err("failure");
  return all([
    check(isErr(okResult), toBe(false)),
    check(isErr(errResult), toBe(true)),
  ]);
});

test("isResult identifies Result types", () => {
  const okResult = ok(123);
  const errResult = err("error");
  const notResult = { random: "object" };
  const nullValue = null;
  const undefinedValue = undefined;
  return all([
    check(isResult(okResult), toBe(true)),
    check(isResult(errResult), toBe(true)),
    check(isResult(notResult), toBe(false)),
    check(isResult(nullValue), toBe(false)),
    check(isResult(undefinedValue), toBe(false)),
  ]);
});

test("result.isOk() method returns true for Ok instances", () => {
  const okResult = ok("success");
  return all([
    check(isOk(okResult), toBe(true)),
    check(isErr(okResult), toBe(false)),
    check(okResult, okThen(toBe("success"))),
  ]);
});

test("result.isErr() method returns true for Err instances", () => {
  const errResult = err("failure");
  return all([
    check(isOk(errResult), toBe(false)),
    check(isErr(errResult), toBe(true)),
    check(errResult, errThen(toBe("failure"))),
  ]);
});

test("result methods work with Result union type", () => {
  const okResult: Result<number, string> = ok(42);
  const errResult: Result<number, string> =
    err("error");
  return all([
    check(isOk(okResult), toBe(true)),
    check(isErr(okResult), toBe(false)),
    check(okResult, okThen(toBe(42))),
    check(isOk(errResult), toBe(false)),
    check(isErr(errResult), toBe(true)),
    check(errResult, errThen(toBe("error"))),
  ]);
});

test("Result can handle different types", () => {
  const stringResult: Result<string, number> =
    ok("hello");
  const numberErrorResult: Result<
    string,
    number
  > = err(404);
  return all([
    check(isOk(stringResult), toBe(true)),
    check(isErr(numberErrorResult), toBe(true)),
    check(stringResult, okThen(toBe("hello"))),
    check(numberErrorResult, errThen(toBe(404))),
  ]);
});

test("mapOk transforms success values while preserving errors", () => {
  const formatPrice = (
    price: number,
  ): Result<string, InvalidError> =>
    ok(`$${price.toFixed(2)}`);

  const successResult = chainResult(formatPrice)(
    ok(29.99),
  );

  const priceError = invalidError({
    message: "Invalid price",
  });
  const e = err(priceError);
  const errorResult = chainResult(formatPrice)(e);
  return all([
    check(successResult, okThen(toBe("$29.99"))),
    check(
      errorResult,
      errThen((er) =>
        toBe("Invalid price")(er.content.message),
      ),
    ),
  ]);
});

test("Result Monad - map function", () => {
  const double = (x: number) => x * 2;
  const okValue = ok(5);
  const errValue = err("error");

  const r1 = pipe(okValue, mapResult(double));
  const r2 = pipe(errValue, mapResult(double));
  return all([
    check(r1, okThen(toBe(10))),
    check(r2, errThen(toBe("error"))),
  ]);
});

test("mapErr transforms error values while preserving successes", () => {
  const toLength = (e: string) => e.length;
  const okValue: Result<number, string> = ok(5);
  const errValue: Result<number, string> =
    err("boom");

  const r1 = pipe(okValue, mapErr(toLength));
  const r2 = pipe(errValue, mapErr(toLength));
  return all([
    check(r1, okThen(toBe(5))),
    check(r2, errThen(toBe(4))),
  ]);
});

test("matchResult folds both channels into one value", () => {
  const fold = matchResult(
    (e: string) => `err:${e}`,
    (v: number) => `ok:${v}`,
  );
  return all([
    check(fold(ok(7)), toBe("ok:7")),
    check(fold(err("nope")), toBe("err:nope")),
  ]);
});

test("Result Monad - ap function (applicative)", () => {
  const add = (x: number) => (y: number) => x + y;
  const okAdd3: Result<
    (y: number) => number,
    string
  > = ok(add(3));
  const okNumber: Result<number, string> = ok(5);
  const errFunction: Result<
    (y: number) => number,
    string
  > = err("function error");
  const errValue: Result<number, string> = err(
    "value error",
  );

  const r1 = pipe(okNumber, applyResult(okAdd3));
  const r2 = pipe(
    okNumber,
    applyResult(errFunction),
  );
  const r3 = pipe(
    errValue,
    applyResult<number, number, string>(okAdd3),
  );
  const r4 = pipe(
    errValue,
    applyResult(errFunction),
  );
  return all([
    check(r1, okThen(toBe(8))),
    check(r2, errThen(toBe("function error"))),
    check(r3, errThen(toBe("value error"))),
    check(r4, errThen(toBe("function error"))),
  ]);
});

test("Result Monad - of function", () => {
  const r1 = pipe(42, ofResult);
  const r2 = pipe("hello", ofResult);
  const r3 = pipe(null, ofResult);
  return all([
    check(r1, okThen(toBe(42))),
    check(r2, okThen(toBe("hello"))),
    check(r3, okThen(toBe(null))),
  ]);
});

test("Result Monad - chain function", () => {
  const safeDivide =
    (y: number) =>
    (x: number): Result<number, string> =>
      y === 0
        ? err("Division by zero")
        : ok(x / y);

  const okNumber = ok(10);
  const errNumber = err("Invalid number");

  const r1 = pipe(
    okNumber,
    chainResult(safeDivide(2)),
  );
  const r2 = pipe(
    okNumber,
    chainResult(safeDivide(0)),
  );
  const r3 = pipe(
    errNumber,
    chainResult(safeDivide(2)),
  );
  return all([
    check(r1, okThen(toBe(5))),
    check(r2, errThen(toBe("Division by zero"))),
    check(r3, errThen(toBe("Invalid number"))),
  ]);
});

test("Result Monad Laws - Left Identity", () => {
  const f = (x: number): Result<number, string> =>
    ok(x * 2);
  const a = 5;

  const r1 = pipe(a, ofResult, chainResult(f));
  const r2 = f(a);
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    check(r1.content, toEqual(r2.content)),
  ]);
});

test("Result Monad Laws - Right Identity", () => {
  const m = ok(42);

  const r1 = pipe(m, chainResult(ofResult));
  const r2 = m;
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    check(r1.content, toEqual(r2.content)),
  ]);
});

test("Result Monad Laws - Associativity", () => {
  const f = (x: number): Result<number, string> =>
    ok(x + 1);
  const g = (x: number): Result<number, string> =>
    ok(x * 2);
  const m = ok(5);

  const r1 = pipe(
    m,
    chainResult(f),
    chainResult(g),
  );
  const r2 = pipe(
    m,
    chainResult((x: number) =>
      pipe(x, f, chainResult(g)),
    ),
  );
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    check(r1.content, toEqual(r2.content)),
  ]);
});

test("Result Functor Laws - Identity", () => {
  const res = ok(42);
  const identity = <T>(x: T) => x;

  const r1 = pipe(res, mapResult(identity));
  return all([
    check(r1.__tag, toBe(res.__tag)),
    check(r1.content, toEqual(res.content)),
  ]);
});

test("Result Functor Laws - Composition", () => {
  const res = ok(5);
  const f = (x: number) => x * 2;
  const g = (x: number) => x + 1;

  const r1 = pipe(
    res,
    mapResult((x: number) => g(f(x))),
  );
  const r2 = pipe(
    res,
    mapResult(f),
    mapResult(g),
  );
  return all([
    check(r1.__tag, toBe(r2.__tag)),
    check(r1.content, toEqual(r2.content)),
  ]);
});

test("Result Foldable - foldr function", () => {
  const add = (a: number, b: number) => a + b;
  const concat = (a: string, b: string) => a + b;

  const r1 = pipe(ok(42), foldrResult(add)(0));
  const r2 = pipe(
    err("failed"),
    foldrResult(add)(0),
  );
  const r3 = pipe(
    ok("hello"),
    foldrResult(concat)(""),
  );
  return all([
    check(r1, toBe(42)),
    check(r2, toBe(0)),
    check(r3, toBe("hello")),
  ]);
});

test("Result Foldable - foldl function", () => {
  const add = (a: number, b: number) => a + b;
  const concat = (a: string, b: string) => a + b;

  const r1 = pipe(ok(42), foldlResult(add)(0));
  const r2 = pipe(
    err("failed"),
    foldlResult(add)(0),
  );
  const r3 = pipe(
    ok("world"),
    foldlResult(concat)("hello "),
  );
  return all([
    check(r1, toBe(42)),
    check(r2, toBe(0)),
    check(r3, toBe("hello world")),
  ]);
});

test("User data validation pipeline with optional fields", () => {
  type User = {
    id: number;
    name: string;
    email?: string;
  };

  const validateEmail = (email: string) =>
    email.includes("@")
      ? some(email.toLowerCase())
      : none();

  const processUser = (
    userData: Result<User, string>,
  ) =>
    pipe(
      userData,
      traverseResult(optionApplicative)(
        (user: User) =>
          user.email
            ? validateEmail(user.email)
            : some(undefined),
      ),
    );

  const validUser = ok({
    id: 1,
    name: "Alice",
    email: "ALICE@EXAMPLE.COM",
  });
  const result1 = processUser(validUser);

  const invalidEmailUser = ok({
    id: 2,
    name: "Bob",
    email: "not-an-email",
  });
  const result2 = processUser(invalidEmailUser);

  const parseError = err("Invalid JSON");
  const result3 = processUser(parseError);
  return all([
    check(
      result1,
      someThen((r) =>
        check(
          r,
          okThen(toBe("alice@example.com")),
        ),
      ),
    ),
    check(isNone(result2), toBe(true)),
    check(
      result3,
      someThen((r) =>
        check(r, errThen(toBe("Invalid JSON"))),
      ),
    ),
  ]);
});

test("Database query with optional caching", () => {
  type QueryResult = {
    data: string;
    cached: boolean;
  };

  const checkCache = (query: string) =>
    query.length < 10
      ? some(`cached_${query}`)
      : none();

  const executeQuery = (
    queryResult: Result<QueryResult, string>,
  ) =>
    pipe(
      queryResult,
      traverseResult(optionApplicative)(
        (result: QueryResult) =>
          result.cached
            ? checkCache(result.data)
            : some(result.data),
      ),
    );

  const cachedQuery = ok({
    data: "users",
    cached: true,
  });
  const result1 = executeQuery(cachedQuery);

  const directQuery = ok({
    data: "complex_analytics",
    cached: false,
  });
  const result2 = executeQuery(directQuery);

  const longCachedQuery = ok({
    data: "very_long_query_name",
    cached: true,
  });
  const result3 = executeQuery(longCachedQuery);
  return all([
    check(
      result1,
      someThen((r) =>
        check(r, okThen(toBe("cached_users"))),
      ),
    ),
    check(
      result2,
      someThen((r) =>
        check(
          r,
          okThen(toBe("complex_analytics")),
        ),
      ),
    ),
    check(isNone(result3), toBe(true)),
  ]);
});

test("sequenceResult - sequence with Option", () => {
  const okWithSome = ok(some(42));
  const result1 = pipe(
    okWithSome,
    sequenceResult(optionApplicative),
  );

  const okWithNone = ok(none());
  const result2 = pipe(
    okWithNone,
    sequenceResult(optionApplicative),
  );

  const errResult = err("error");
  const result3 = pipe(
    errResult,
    sequenceResult(optionApplicative),
  );
  return all([
    check(
      result1,
      someThen((r) => check(r, okThen(toBe(42)))),
    ),
    check(result2, shouldBeNone()),
    check(
      result3,
      someThen((r) =>
        check(r, errThen(toBe("error"))),
      ),
    ),
  ]);
});
