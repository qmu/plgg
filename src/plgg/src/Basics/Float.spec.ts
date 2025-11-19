import { test, expect, assert } from "vitest";
import { isFloat, asFloat, isOk, isErr, newBox } from "plgg/index";

test("isFloat and asFloat basic validation", () => {
  expect(isFloat(newBox("Float")(3.14))).toBe(true);
  const result = asFloat(newBox("Float")(2.5));
  assert(isOk(result));
  expect(result.content.content).toBe(2.5);
  assert(isErr(asFloat("test")));
});
