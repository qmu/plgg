import { test, expect, assert } from "vitest";
import {
  pipe,
  proc,
  match,
  isErr,
  TRUE,
  FALSE,
  ParametricVariant,
  pattern,
  construct,
  OTHERWISE,
  Ok,
  ok,
  err,
  Result,
  Some,
  None,
  some,
  none,
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
    pipe(
      a,
      match(
        [TRUE, () => "true"],
        [FALSE, () => "false"], // should compile error when erased
        // [3 as const, () => "3"], // should compile error when uncommented
      ),
      (a) => a,
    );
  expect(fn(true)).equal("true");
});

test("string", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: status) =>
    pipe(
      a,
      match(
        [s1, () => "a"],
        [s2, () => "b"],
        [s3, () => "c"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      ),
      (a) => a,
    );
  expect(fn("c")).equal("c");
});

test("plgg string", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: status) =>
    proc(
      a,
      match(
        [s1, () => "a"],
        [s2, () => "b"],
        [s3, () => "c"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      ),
      (a) => a,
    );
  const r = await fn("c");
  if (isErr(r)) {
    assert.fail("Expected success, got error");
  }
  expect(r.content).equal("c");
});

test("otherwise", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const;
  type status = typeof s1 | typeof s2 | typeof s3;
  const fn = (a: status) =>
    pipe(
      a,
      match(
        [s1, () => "a"],
        [s2, () => "b"],
        [OTHERWISE, () => "default"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      ),
      (a) => a,
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
  const Circle = pattern<Circle>("Circle");

  type Square = ParametricVariant<
    "Square",
    {
      side: number;
    }
  >;
  const Square = pattern<Square>("Square");

  type Triangle = ParametricVariant<
    "Triangle",
    {
      base: number;
      height: number;
    }
  >;
  const Triangle = pattern<Triangle>("Triangle");
  const triangle =
    construct<Triangle>("Triangle");
  type Shape = Circle | Square | Triangle;

  const fn = (a: Shape) =>
    pipe(
      a,
      match(
        [Circle(), () => "a"],
        [Square(), () => "b"],
        [Triangle(), () => "c"],
      ),
      (a) => a,
    );

  const realTriangle = triangle({
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
  const AST = pattern<AST>("AST");
  const ast = construct<AST>("AST");

  const fn = (a: AST) =>
    pipe(
      a,
      match(
        [AST({ type: "root" }), () => "root"],
        [AST({ type: "leaf" }), () => "leaf"],
        [AST({ type: "branch" }), () => "branch"],
        [OTHERWISE, () => "default"],
      ),
      (a) => a,
    );

  const realAst = ast({
    type: "branch",
    children: [ast({ type: "leaf" })],
  });

  expect(fn(realAst)).equal("branch");
});

test("Result pattern matching", async () => {
  const fn = (a: Result<string, number>) =>
    pipe(
      a,
      match(
        [ok("hello"), () => "Specific hello"],
        [
          OTHERWISE,
          (value) =>
            `Matched: ${JSON.stringify(value)}`,
        ],
      ),
    );

  const successResult = ok("hello");
  const errorResult = err(404);

  expect(fn(successResult)).equal(
    "Specific hello",
  );
  expect(fn(errorResult)).equal(
    'Matched: {"__tag":"Err","content":404}',
  );
});

test("Result pattern matching with specific patterns", async () => {
  const fn = (a: Result<number, string>) =>
    pipe(
      a,
      match(
        [ok(42), () => "The answer!"],
        [
          err("not_found"),
          () => "Not found error",
        ],
        [
          OTHERWISE,
          (value) =>
            `Matched: ${JSON.stringify(value)}`,
        ],
      ),
    );

  expect(fn(ok(42))).equal("The answer!");
  expect(fn(ok(100))).equal(
    'Matched: {"__tag":"Ok","content":100}',
  );
  expect(fn(err("not_found"))).equal(
    "Not found error",
  );
  expect(fn(err("server_error"))).equal(
    'Matched: {"__tag":"Err","content":"server_error"}',
  );
});

test("Result pattern matching with OTHERWISE", async () => {
  const fn = (a: Result<string, number>) =>
    pipe(
      a,
      match(
        [Ok("success"), () => "Specific success"],
        [
          OTHERWISE,
          (value) =>
            `Fallback: ${JSON.stringify(value)}`,
        ],
      ),
    );

  expect(fn(ok("success"))).equal(
    "Specific success",
  );
  expect(fn(ok("other"))).equal(
    'Fallback: {"__tag":"Ok","content":"other"}',
  );
  expect(fn(err(500))).equal(
    'Fallback: {"__tag":"Err","content":500}',
  );
});

test("Option pattern matching", async () => {
  const fn = (a: Option<string>) =>
    pipe(
      a,
      match(
        [Some("hello"), () => "Specific hello"],
        [
          OTHERWISE,
          (value) =>
            `Matched: ${JSON.stringify(value)}`,
        ],
      ),
    );

  const someResult = some("hello");
  const noneResult = none();

  expect(fn(someResult)).equal("Specific hello");
  expect(fn(noneResult)).equal(
    'Matched: {"__tag":"None"}',
  );
});

test("Option pattern matching with specific patterns", async () => {
  const fn = (a: Option<number>) =>
    pipe(
      a,
      match(
        [Some(42), () => "The answer!"],
        [None(), () => "No value"],
        [
          OTHERWISE,
          (value) =>
            `Matched: ${JSON.stringify(value)}`,
        ],
      ),
    );

  expect(fn(some(42))).equal("The answer!");
  expect(fn(some(100))).equal(
    'Matched: {"__tag":"Some","content":100}',
  );
  expect(fn(none())).equal("No value");
});

test("Option pattern matching with OTHERWISE", async () => {
  const fn = (a: Option<string>) =>
    pipe(
      a,
      match(
        [Some("success"), () => "Specific success"],
        [
          OTHERWISE,
          (value) =>
            `Fallback: ${JSON.stringify(value)}`,
        ],
      ),
    );

  expect(fn(some("success"))).equal(
    "Specific success",
  );
  expect(fn(some("other"))).equal(
    'Fallback: {"__tag":"Some","content":"other"}',
  );
  expect(fn(none())).equal(
    'Fallback: {"__tag":"None"}',
  );
});
