import { test, expect, assert } from "vitest";
import {
  isU8,
  asU8,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isU8 and asU8 basic validation", () => {
  expect(isU8(box("U8")(42))).toBe(true);
  const result = asU8(box("U8")(200));
  assert(isOk(result));
  expect(result.content.content).toBe(200);
  assert(isErr(asU8(300)));
});
