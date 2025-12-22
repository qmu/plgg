import { test, expect, assert } from "vitest";
import { isInt, asInt, isOk, isErr } from "plgg/index";

test("isInt and asInt basic validation", () => {
  expect(isInt(42)).toBe(true);
  const result = asInt(100);
  assert(isOk(result));
  expect(result.content).toBe(100);
  assert(isErr(asInt(3.14)));
});
