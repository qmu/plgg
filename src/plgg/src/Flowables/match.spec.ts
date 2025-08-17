import { test, expect } from "vitest";
import {
  pipe,
  match,
  TRUE,
  FALSE,
  ParametricVariant,
  pattern,
  construct,
  otherwise,
  ok,
  newOk,
  newErr,
  Result,
  some,
  none,
  newSome,
  newNone,
  Option,
} from "plgg/index";

test("number", async () => {
  const s1 = 1 as const,
    s2 = 2 as const,
    s3 = 3 as const;
  type status = typeof s1 | typeof s2 | typeof s3;

  const fn = (a: status) =>
    pipe(
      a,
      match(
        [s1, () => "1"],
        [s2, () => "2"],
        [s3, () => "3"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      ),
      (a) => a,
    );
  expect(fn(3)).equal("3");
});

test("boolean", async () => {
  const fn = (a: boolean) =>
    match(
      a,
      [TRUE, () => "true"],
      [FALSE, () => "false"], // should compile error when erased
      // [3 as const, () => "3"], // should compile error when uncommented
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
      [s3, () => "c"], // should compile error when erased
      //[4 as const, () => "4"], // should compile error when uncommented
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
      //[4 as const, () => "4"], // should compile error when uncommented
    );
  expect(fn("c")).equal("default");
});

test("Variant1", async () => {
  type Circle = ParametricVariant<
    "Circle",
    {
      radius: number;
    }
  >;
  const circle = pattern<Circle>("Circle");

  type Square = ParametricVariant<
    "Square",
    {
      side: number;
    }
  >;
  const square = pattern<Square>("Square");

  type Triangle = ParametricVariant<
    "Triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = pattern<Triangle>("Triangle");
  const newTriangle =
    construct<Triangle>("Triangle");
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
  type AST = ParametricVariant<
    "AST",
    {
      type: "root" | "leaf" | "branch";
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = pattern<AST>("AST");
  const newAST = construct<AST>("AST");

  const fn = (a: AST) =>
    match(
      a,
      [ast({ type: "root" }), () => "root"],
      [ast({ type: "leaf" }), () => "leaf"],
      [ast({ type: "branch" }), () => "branch"],
      [otherwise, () => "default"],
    );

  const realAst = newAST({
    type: "branch",
    children: [newAST({ type: "leaf" })],
  });

  expect(fn(realAst)).equal("branch");
});

test("Result pattern matching", async () => {
  const fn = (a: Result<string, number>) =>
    match(
      a,
      [newOk("hello"), () => "Specific hello"],
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
    'Matched: {"__tag":"Err","body":404}',
  );
});

test("Result pattern matching with specific patterns", async () => {
  const fn = (a: Result<number, string>) =>
    match(
      a,
      [newOk(42), () => "The answer!"],
      [
        newErr("not_found"),
        () => "Not found error",
      ],
      [
        otherwise,
        (value) =>
          `Matched: ${JSON.stringify(value)}`,
      ],
    );

  expect(fn(newOk(42))).equal("The answer!");
  expect(fn(newOk(100))).equal(
    'Matched: {"__tag":"Ok","body":100}',
  );
  expect(fn(newErr("not_found"))).equal(
    "Not found error",
  );
  expect(fn(newErr("server_error"))).equal(
    'Matched: {"__tag":"Err","body":"server_error"}',
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
    'Fallback: {"__tag":"Ok","body":"other"}',
  );
  expect(fn(newErr(500))).equal(
    'Fallback: {"__tag":"Err","body":500}',
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
      [
        some({ body: 1 }),
        (a) => a + 1 + "The answer!",
      ],
      [none(), () => "No value"],
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
    'Fallback: {"__tag":"Some","body":"other"}',
  );
  expect(fn(newNone())).equal(
    'Fallback: {"__tag":"None"}',
  );
});
