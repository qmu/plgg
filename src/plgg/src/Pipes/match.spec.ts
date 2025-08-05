import { test, expect, assert } from "vitest";
import {
  pipe,
  plgg,
  match,
  isErr,
  TRUE,
  FALSE,
  ParametricVariant,
  pattern,
  OTHERWISE,
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
    plgg(
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

test("default", async () => {
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

/**
 * Example3
 */
{
  type Circle = ParametricVariant<
    "circle",
    {
      radius: number;
    }
  >;
  const circle = pattern("circle")<Circle>();

  type Square = ParametricVariant<
    "square",
    {
      side: number;
    }
  >;
  const square = pattern("square")<Square>();

  type Triangle = ParametricVariant<
    "triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = pattern("triangle")<Triangle>();

  type Shape = Circle | Square | Triangle;

  (a: Shape) =>
    pipe(
      a,
      match(
        [circle(), () => "a"],
        [square(), () => "b"],
        [triangle(), () => "b"],
      ),
      (a) => a,
    );
}

/**
 * Example4
 */
{
  type AST = ParametricVariant<
    "ast",
    {
      type: "root" | "leaf" | "branch";
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = pattern("ast")<AST>();

  (a: AST) =>
    pipe(
      a,
      match(
        [ast({ type: "root" }), () => "root"],
        [ast({ type: "leaf" }), () => "leaf"],
        [ast({ type: "branch" }), () => "branch"],
        [OTHERWISE, () => "default"],
      ),
      (a) => a,
    );
}
