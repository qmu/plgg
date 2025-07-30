import { test, expect, assert } from "vitest";
import { pipe, plgg, match, isErr, TRUE, FALSE, DEFAULT } from "plgg/index";

const variant = <T>(label: T) => ({ __variant: label satisfies T }) as const;

const hoge = variant<"hoge">("hoge");

export type Hoge = typeof hoge;

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
  expect(r.ok).equal("c");
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
        ["hoge", () => "b"],
        [DEFAULT, () => "default"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      ),
      (a) => a,
    );
  expect(fn("c")).equal("default");
});

test("object", async () => {
  const circle = { type: "circle", radius: 5 } as const,
    square = { type: "square", side: 4 } as const,
    triangle = { type: "triangle", base: 3, height: 4 } as const;
  type Shape = typeof circle | typeof square | typeof triangle;
  const fn = (a: Shape) =>
    pipe(
      a,
      match(
        [{ type: "circle" }, () => "a"],
        [{ type: "square" }, () => "b"],
        [DEFAULT, () => "default"], // should compile error when erased
        //[4 as const, () => "4"], // should compile error when uncommented
      )<Shape>,
      (a) => a,
    );
  expect(
    fn({
      type: "triangle",
      base: 3,
      height: 4,
    }),
  ).equal("default");
});
