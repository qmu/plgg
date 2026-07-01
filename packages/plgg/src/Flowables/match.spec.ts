import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  Box,
  Result,
  Option,
  TRUE,
  FALSE,
  match,
  pattern,
  otherwise,
  coverageError,
  isCoverageError,
  ok$,
  err$,
  ok,
  err,
  some$,
  none$,
  some,
  none,
  box,
} from "plgg/index";

test("number", async () => {
  const s1 = 1 as const,
    s2 = 2 as const,
    s3 = 3 as const;
  type status = typeof s1 | typeof s2 | typeof s3;

  const fn = (a: status) =>
    match(a)(
      [s1, () => "1"],
      [s2, () => "2"],
      [s3, () => "3"], // should compile error when erased
      //[4 as const, () => "4"], // should compile error when uncommented
    );
  return check(fn(3), toBe("3"));
});

test("boolean", async () => {
  const fn = (a: boolean) =>
    match(a)(
      [TRUE, () => "true"],
      [FALSE, () => "false"],
    );
  return check(fn(true), toBe("true"));
});

test("string", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type Status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: Status) =>
    match(a)(
      [s1, () => "a"],
      [s2, () => "b"],
      [s3, () => "c"],
      // ["d" as const, () => "d"], // should compile error when uncommented
    );
  return check(fn("c"), toBe("c"));
});

test("otherwise", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type Status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: Status) =>
    match(a)(
      [s1, () => "a"],
      [s2, () => "b"],
      [otherwise, () => "default"], // should compile error when erased
    );
  return check(fn("c"), toBe("default"));
});

test("Variant1", async () => {
  type Circle = Box<
    "Circle",
    {
      radius: number;
    }
  >;
  const circle$ = pattern("Circle" as const);

  type Square = Box<
    "Square",
    {
      side: number;
    }
  >;
  const square$ = pattern("Square" as const);

  type Triangle = Box<
    "Triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle$ = pattern("Triangle" as const);
  const triangle = box("Triangle");
  type Shape = Circle | Square | Triangle;

  const fn = (a: Shape) =>
    match(a)(
      [circle$(), () => "a"],
      [square$(), () => "b"],
      [triangle$(), () => "c"],
    );

  const realTriangle = triangle({
    base: 1,
    height: 4,
  });
  return check(fn(realTriangle), toBe("c"));
});

test("Variant2", async () => {
  type ast = {
    type: "root" | "leaf" | "branch";
    children?: ReadonlyArray<AST>;
  };
  type AST = Box<"AST", ast>;
  const ast$ = pattern("AST");
  const ast = box("AST");

  const fn = (a: AST) =>
    match(a)(
      [ast$({ type: "root" }), () => "root"],
      [ast$({ type: "leaf" }), () => "leaf"],
      [ast$({ type: "branch" }), () => "branch"],
      [otherwise, () => "default"],
    );

  const realAst = ast({
    type: "branch" as const,
    children: [ast({ type: "leaf" as const })],
  });

  return check(fn(realAst), toBe("branch"));
});

test("Result pattern matching", async () => {
  const fn = (a: Result<string, number>) =>
    match(a)(
      [ok$("hello"), () => "Specific hello"],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  const successResult = ok("hello");
  const errorResult = err(404);

  return all([
    check(
      fn(successResult),
      toBe("Specific hello"),
    ),
    check(
      fn(errorResult),
      toBe(
        'Matched: {"__tag":"Err","content":404}',
      ),
    ),
  ]);
});

test("Result pattern matching with specific patterns", async () => {
  const fn = (a: Result<number, string>) =>
    match(a)(
      [ok$(42), () => "The answer!"],
      [
        err$("not_found"),
        () => "Not found error",
      ],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  return all([
    check(fn(ok(42)), toBe("The answer!")),
    check(
      fn(ok(100)),
      toBe(
        'Matched: {"__tag":"Ok","content":100}',
      ),
    ),
    check(
      fn(err("not_found")),
      toBe("Not found error"),
    ),
    check(
      fn(err("server_error")),
      toBe(
        'Matched: {"__tag":"Err","content":"server_error"}',
      ),
    ),
  ]);
});

test("Result pattern matching with OTHERWISE", async () => {
  const fn = (a: Result<string, number>) =>
    match(a)(
      [ok$("success"), () => "Specific success"],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  return all([
    check(
      fn(ok("success")),
      toBe("Specific success"),
    ),
    check(
      fn(ok("other")),
      toBe(
        'Fallback: {"__tag":"Ok","content":"other"}',
      ),
    ),
    check(
      fn(err(500)),
      toBe(
        'Fallback: {"__tag":"Err","content":500}',
      ),
    ),
  ]);
});

test("Option pattern matching", async () => {
  const fn = (a: Option<string>) =>
    match(a)(
      [some$("hello"), () => "Specific hello"],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  const someResult = some("hello");
  const noneResult = none();

  return all([
    check(fn(someResult), toBe("Specific hello")),
    check(
      fn(noneResult),
      toBe(
        'Matched: {"__tag":"None","content":"__none__"}',
      ),
    ),
  ]);
});

test("Option pattern matching with specific patterns", async () => {
  const fn = (a: Option<number>) =>
    match(a)(
      [some$(100), () => "The answer!"],
      [none$(), () => "No value"],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  return all([
    check(fn(some(100)), toBe("The answer!")),
    check(fn(none()), toBe("No value")),
  ]);
});

test("Option pattern matching with OTHERWISE", async () => {
  const fn = (a: Option<string>) =>
    match(a)(
      [
        some$("success"),
        () => "Specific success",
      ],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  return all([
    check(
      fn(some("success")),
      toBe("Specific success"),
    ),
    check(
      fn(some("other")),
      toBe(
        'Fallback: {"__tag":"Some","content":"other"}',
      ),
    ),
    check(
      fn(none()),
      toBe(
        'Fallback: {"__tag":"None","content":"__none__"}',
      ),
    ),
  ]);
});

test("tag handlers receive the narrowed box and read typed .content", async () => {
  type NotFound = Box<"NotFound", string>;
  type MethodNotAllowed = Box<
    "MethodNotAllowed",
    ReadonlyArray<string>
  >;
  type ServerError = Box<"ServerError", string>;
  type HttpError =
    | NotFound
    | MethodNotAllowed
    | ServerError;

  // Each handler reads the matched variant's content with no `as`: a string for
  // NotFound/ServerError, a ReadonlyArray for MethodNotAllowed.
  const render = (e: HttpError): string =>
    match(e)(
      [
        pattern("NotFound")(),
        (b) => `404 ${b.content}`,
      ],
      [
        pattern("MethodNotAllowed")(),
        (b) => `405 ${b.content.join(", ")}`,
      ],
      [
        pattern("ServerError")(),
        (b) => `500 ${b.content}`,
      ],
    );

  return all([
    check(
      render(box("NotFound")("/x")),
      toBe("404 /x"),
    ),
    check(
      render(
        box("MethodNotAllowed")(["GET", "PUT"]),
      ),
      toBe("405 GET, PUT"),
    ),
    check(
      render(box("ServerError")("boom")),
      toBe("500 boom"),
    ),
  ]);
});

test("coverageError builds a CoverageError value carrying the input", () => {
  const e = coverageError(42);
  return all([
    check(e.__nonExhaustiveMatch, toBe(42)),
    check(isCoverageError(e), toBe(true)),
  ]);
});

test("isCoverageError is false for non-CoverageError values", () =>
  all([
    check(
      isCoverageError(new Error("x")),
      toBe(false),
    ),
    check(
      isCoverageError({ foo: 1 }),
      toBe(false),
    ),
    check(isCoverageError(null), toBe(false)),
    check(isCoverageError("nope"), toBe(false)),
  ]));

test("a runtime non-exhaustive match returns a CoverageError value, not an Error", () => {
  type ABC =
    | Box<"A", number>
    | Box<"B", string>
    | Box<"C", boolean>;
  const value: ABC = box("A")(1);
  // Only "B" and "C" are covered, so the call is non-exhaustive: its type is
  // CoverageError<ABC>, and at runtime the unmatched "A" box falls through.
  const result = match(value)(
    [pattern("B")(), () => "b"],
    [pattern("C")(), () => "c"],
  );
  return all([
    check(isCoverageError(result), toBe(true)),
    check(
      isCoverageError(result)
        ? result.__nonExhaustiveMatch
        : undefined,
      toBe(value),
    ),
  ]);
});
