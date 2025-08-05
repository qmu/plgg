import { test, expect } from "vitest";
import {
  ParametricVariant,
  variantMaker,
  pattern,
  pipe,
  match,
  OTHERWISE,
} from "plgg/index";

test("tagged union", async () => {
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
  const ofTriangle = variantMaker<"triangle", Triangle>("triangle")();

  type Shape = Circle | Square | Triangle;
  const fn = (a: Shape) =>
    pipe(
      a,
      match(
        [circle(), () => "a"],
        [square(), () => "b"],
        [triangle({ base: 0 }), () => "c"],
        [triangle({ base: 1 }), () => "d"],
        [OTHERWISE, () => "default"],
      ),
      (a) => a,
    );

  const realTriangle = ofTriangle({
    base: 1,
    height: 4,
  });

  expect(fn(realTriangle)).equal("d");
});

test("recurring structure like AST", async () => {
  type AST = ParametricVariant<
    "ast",
    {
      type: "root" | "leaf" | "branch";
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = pattern("ast")<AST>();
  const makeAst = variantMaker<"ast", AST>("ast")();

  const fn = (a: AST) =>
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

  const realAst = makeAst({
    type: "branch",
    children: [makeAst({ type: "leaf" })],
  });

  expect(fn(realAst)).equal("branch");
});
