import { test, expect } from "vitest";
import {
  Box,
  Result,
  Option,
  TRUE,
  FALSE,
  match,
  pattern,
  otherwise,
  ok,
  err,
  newOk,
  newErr,
  some,
  none,
  newSome,
  newNone,
  newBox,
} from "plgg/index";

test("number", async () => {
  const s1 = 1 as const,
    s2 = 2 as const,
    s3 = 3 as const;
  type status = typeof s1 | typeof s2 | typeof s3;

  const fn = (a: status) =>
    match(
      a,
      [s1, () => "1"],
      [s2, () => "2"],
      [s3, () => "3"], // should compile error when erased
      //[4 as const, () => "4"], // should compile error when uncommented
    );
  expect(fn(3)).equal("3");
});

test("boolean", async () => {
  const fn = (a: boolean) =>
    match(
      a,
      [TRUE, () => "true"],
      [FALSE, () => "false"],
    );
  expect(fn(true)).equal("true");
});

test("string", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type Status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: Status) =>
    match(
      a,
      [s1, () => "a"],
      [s2, () => "b"],
      [s3, () => "c"],
      // ["d" as const, () => "d"], // should compile error when uncommented
    );
  expect(fn("c")).equal("c");
});

test("otherwise", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type Status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: Status) =>
    match(
      a,
      [s1, () => "a"],
      [s2, () => "b"],
      [otherwise, () => "default"], // should compile error when erased
    );
  expect(fn("c")).equal("default");
});

test("Variant1", async () => {
  type Circle = Box<
    "Circle",
    {
      radius: number;
    }
  >;
  const circle = pattern("Circle" as const);

  type Square = Box<
    "Square",
    {
      side: number;
    }
  >;
  const square = pattern("Square" as const);

  type Triangle = Box<
    "Triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = pattern("Triangle" as const);
  const newTriangle = newBox("Triangle");
  type Shape = Circle | Square | Triangle;

  const fn = (a: Shape) =>
    match(
      a,
      [circle(), () => "a"],
      [square(), () => "b"],
      [triangle(), () => "c"],
    );

  const realTriangle = newTriangle({
    base: 1,
    height: 4,
  });
  expect(fn(realTriangle)).equal("c");
});

test("Variant2", async () => {
  type ast = {
    type: "root" | "leaf" | "branch";
    children?: ReadonlyArray<AST>;
  };
  type AST = Box<"AST", ast>;
  const ast = pattern("AST");
  const newAST = newBox("AST");

  const fn = (a: AST) =>
    match(
      a,
      [ast({ type: "root" }), () => "root"],
      [ast({ type: "leaf" }), () => "leaf"],
      [ast({ type: "branch" }), () => "branch"],
      [otherwise, () => "default"],
    );

  const realAst = newAST({
    type: "branch" as const,
    children: [newAST({ type: "leaf" as const })],
  });

  expect(fn(realAst)).equal("branch");
});

test("Result pattern matching", async () => {
  const fn = (a: Result<string, number>) =>
    match(
      a,
      [ok("hello"), () => "Specific hello"],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  const successResult = newOk("hello");
  const errorResult = newErr(404);

  expect(fn(successResult)).equal(
    "Specific hello",
  );
  expect(fn(errorResult)).equal(
    'Matched: {"__tag":"Err","content":404}',
  );
});

test("Result pattern matching with specific patterns", async () => {
  const fn = (a: Result<number, string>) =>
    match(
      a,
      [ok(42), () => "The answer!"],
      [err("not_found"), () => "Not found error"],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  expect(fn(newOk(42))).equal("The answer!");
  expect(fn(newOk(100))).equal(
    'Matched: {"__tag":"Ok","content":100}',
  );
  expect(fn(newErr("not_found"))).equal(
    "Not found error",
  );
  expect(fn(newErr("server_error"))).equal(
    'Matched: {"__tag":"Err","content":"server_error"}',
  );
});

test("Result pattern matching with OTHERWISE", async () => {
  const fn = (a: Result<string, number>) =>
    match(
      a,
      [ok("success"), () => "Specific success"],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  expect(fn(newOk("success"))).equal(
    "Specific success",
  );
  expect(fn(newOk("other"))).equal(
    'Fallback: {"__tag":"Ok","content":"other"}',
  );
  expect(fn(newErr(500))).equal(
    'Fallback: {"__tag":"Err","content":500}',
  );
});

test("Option pattern matching", async () => {
  const fn = (a: Option<string>) =>
    match(
      a,
      [some("hello"), () => "Specific hello"],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  const someResult = newSome("hello");
  const noneResult = newNone();

  expect(fn(someResult)).equal("Specific hello");
  expect(fn(noneResult)).equal(
    'Matched: {"__tag":"None"}',
  );
});

test("Option pattern matching with specific patterns", async () => {
  const fn = (a: Option<number>) =>
    match(
      a,
      [some(100), () => "The answer!"],
      [none(), () => "No value"],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  expect(fn(newSome(100))).equal("The answer!");
  expect(fn(newNone())).equal("No value");
});

test("Option pattern matching with OTHERWISE", async () => {
  const fn = (a: Option<string>) =>
    match(
      a,
      [some("success"), () => "Specific success"],
      [
        otherwise,
        (value) =>
          `Fallback: ${JSON.stringify(value)}`,
      ],
    );

  expect(fn(newSome("success"))).equal(
    "Specific success",
  );
  expect(fn(newSome("other"))).equal(
    'Fallback: {"__tag":"Some","content":"other"}',
  );
  expect(fn(newNone())).equal(
    'Fallback: {"__tag":"None"}',
  );
});
