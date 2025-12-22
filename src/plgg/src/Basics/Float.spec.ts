import { test, expect, assert } from "vitest";
import {
  isFloat,
  asFloat,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isFloat and asFloat basic validation", () => {
  expect(isFloat(box("Float")(3.14))).toBe(true);
  const result = asFloat(box("Float")(2.5));
  assert(isOk(result));
  expect(result.content.content).toBe(2.5);
  assert(isErr(asFloat("test")));
});
