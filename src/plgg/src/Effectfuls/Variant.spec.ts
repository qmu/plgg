import { test, expect } from "vitest";
import {
  Variant,
  variantMaker,
  pattern,
  pipe,
  match,
  DEFAULT,
} from "plgg/index";

test("tagged union", async () => {
  type Circle = Variant<
    "circle",
    {
      radius: number;
    }
  >;
  const circle = pattern("circle")<Circle>();

  type Square = Variant<
    "square",
    {
      side: number;
    }
  >;
  const square = pattern("square")<Square>();

  type Triangle = Variant<
    "triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = pattern("triangle")<Triangle>();
  const makeTriangle = variantMaker("triangle")<Triangle>();

  type Shape = Circle | Square | Triangle;
  const fn = (a: Shape) =>
    pipe(
      a,
      match(
        [circle(), () => "a"],
        [square(), () => "b"],
        [triangle({ base: 0 }), () => "c"],
        [triangle({ base: 1 }), () => "d"],
        [DEFAULT, () => "default"],
      ),
      (a) => a,
    );

  const realTriangle = makeTriangle({
    base: 1,
    height: 4,
  });

  expect(fn(realTriangle)).equal("d");
});

test("recurring structure like AST", async () => {
  type AST = Variant<
    "ast",
    {
      type: "root" | "leaf" | "branch";
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = pattern("ast")<AST>();
  const makeAst = variantMaker("ast")<AST>();

  const fn = (a: AST) =>
    pipe(
      a,
      match(
        [ast({ type: "root" }), () => "root"],
        [ast({ type: "leaf" }), () => "leaf"],
        [ast({ type: "branch" }), () => "branch"],
        [DEFAULT, () => "default"],
      ),
      (a) => a,
    );

  const realAst = makeAst({
    type: "branch",
    children: [makeAst({ type: "leaf" })],
  });

  expect(fn(realAst)).equal("branch");
});
