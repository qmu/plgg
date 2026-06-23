import { test, expect, assert } from "plgg-test";
import { isFunc, asFunc, isOk, isErr } from "plgg/index";

test("isFunc basic validation", () => {
  expect(isFunc(() => {})).toBe(true);
  expect(isFunc(function () {})).toBe(true);
  expect(isFunc((x: number) => x + 1)).toBe(true);
  expect(isFunc("not a function")).toBe(false);
  expect(isFunc(123)).toBe(false);
  expect(isFunc(null)).toBe(false);
});

test("asFunc returns Ok for functions", () => {
  const fn = (x: number) => x * 2;
  const result = asFunc(fn);
  assert(isOk(result));
  expect(result.content).toBe(fn);
  expect(result.content(3)).toBe(6);
});

test("asFunc returns Err for non-function values", () => {
  const cases = [
    42,
    "string",
    null,
    undefined,
    {},
    [],
    true,
  ];
  for (const value of cases) {
    const result = asFunc(value);
    assert(isErr(result));
    expect(result.content.content.message).toBe(
      "Value is not a function",
    );
  }
});
