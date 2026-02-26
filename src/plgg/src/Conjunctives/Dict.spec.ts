import { test, expect, assert } from "vitest";
import { asDictOf, asNum, isOk, isErr } from "plgg/index";

test("asDictOf basic validation", () => {
  const result = asDictOf(asNum)({ a: 1, b: 2 });
  assert(isOk(result));
  expect(result.content).toEqual({ a: 1, b: 2 });

  assert(isErr(asDictOf(asNum)({ a: "not", b: "numbers" })));
  assert(isErr(asDictOf(asNum)([])));
});
