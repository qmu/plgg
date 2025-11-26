import { test, expect, assert } from "vitest";
import {
  isI8,
  asI8,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isI8 and asI8 basic validation", () => {
  expect(isI8(box("I8")(42))).toBe(true);
  const result = asI8(box("I8")(100));
  assert(isOk(result));
  expect(result.content.content).toBe(100);
  assert(isErr(asI8(200)));
});
