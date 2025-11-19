import { test, expect, assert } from "vitest";
import { isAlphabet, asAlphabet, isOk, isErr, newBox } from "plgg/index";

test("isAlphabet and asAlphabet basic validation", () => {
  expect(isAlphabet(newBox("Alphabet")("hello"))).toBe(true);
  const result = asAlphabet("test");
  assert(isOk(result));
  expect(result.content.content).toBe("test");
  assert(isErr(asAlphabet("123")));
});
