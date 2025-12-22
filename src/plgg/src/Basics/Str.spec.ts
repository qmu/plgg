import { test, expect, assert } from "vitest";
import {
  isStr,
  asStr,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isStr and asStr basic validation", () => {
  expect(isStr(box("Str")("hello"))).toBe(true);
  const result = asStr("test");
  assert(isOk(result));
  expect(result.content.content).toBe("test");
  assert(isErr(asStr("")));
  assert(isErr(asStr(123)));
});
