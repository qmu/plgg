import { test, expect, assert } from "vitest";
import { isPascalCase, asPascalCase, isOk, isErr, newBox } from "plgg/index";

test("isPascalCase and asPascalCase basic validation", () => {
  expect(isPascalCase(newBox("PascalCase")("PascalCase"))).toBe(true);
  const result = asPascalCase("TestValue");
  assert(isOk(result));
  expect(result.content.content).toBe("TestValue");
  assert(isErr(asPascalCase("camelCase")));
});
