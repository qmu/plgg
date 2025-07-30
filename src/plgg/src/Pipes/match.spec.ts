import { test, expect, assert } from "vitest";
import { DEFAULT, pipe, plgg, match, isErr, True, False } from "plgg/index";

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
        [True, () => "true"],
        [False, () => "false"], // should compile error when erased
        // [3 as const, () => "3"], // should compile error when uncommented
      ),
      (a) => a,
    );
  expect(fn(true)).equal("true");
});

test("string", async () => {
  const s1 = "a" as const,
    s2 = "b" as const,
    s3 = "c" as const,
    s4 = "d" as const;
  type status = typeof s1 | typeof s2 | typeof s3 | typeof s4;
  const fn = (a: status) =>
    pipe(
      a,
      match(
        [s1, () => "a"],
        [s2, () => "b"],
        [s3, () => "c"], // should compile error when erased
        [DEFAULT, () => "hoge"], // should compile error when erased
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
