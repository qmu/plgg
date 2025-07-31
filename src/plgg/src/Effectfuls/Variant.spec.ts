import { test, expect } from "vitest";
import { Variant, variant, pipe, match } from "plgg/index";

test("tagged union", async () => {
  type Circle = Variant<
    "circle",
    {
      radius: number;
    }
  >;
  const circle = variant("circle")<Circle>();

  type Square = Variant<
    "square",
    {
      side: number;
    }
  >;
  const square = variant("square")<Square>();

  type Triangle = Variant<
    "triangle",
    {
      base: number;
      height: number;
    }
  >;
  const triangle = variant("triangle")<Triangle>();

  type Shape = Circle | Square | Triangle;
  const fn = (a: Shape) =>
    pipe(
      a,
      match(
        [circle({ radius: 0 }), () => "a"],
        [square({ side: 0 }), () => "b"],
        [triangle({ base: 0, height: 0 }), () => "b"],
        //[4 as const, () => "4"], // should compile error when uncommented
      )<Shape>,
      (a) => a,
    );

  const realTriangle = triangle({
    base: 3,
    height: 4,
  });

  expect(fn(realTriangle)).equal("b");
});

test("recurring structure like AST", async () => {
  type AST = Variant<
    "ast",
    {
      type: string;
      children?: ReadonlyArray<AST>;
    }
  >;
  const ast = variant("ast")<AST>();

  const fn = (a: AST) =>
    pipe(
      a,
      match(
        [ast({ type: "root", children: [] }), () => "root"],
        [ast({ type: "leaf" }), () => "leaf"],
        [ast({ type: "branch", children: [] }), () => "branch"],
      )<AST>,
      (a) => a,
    );

  const realAst = ast({
    type: "branch",
    children: [ast({ type: "leaf" })],
  });

  expect(fn(realAst)).equal("branch");
});
