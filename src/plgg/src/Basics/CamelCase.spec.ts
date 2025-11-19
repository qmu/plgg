import { test, expect, assert } from "vitest";
import { isCamelCase, asCamelCase, isOk, isErr, newBox } from "plgg/index";

test("isCamelCase and asCamelCase basic validation", () => {
  expect(isCamelCase(newBox("CamelCase")("camelCase"))).toBe(true);
  const result = asCamelCase("testValue");
  assert(isOk(result));
  expect(result.content.content).toBe("testValue");
  assert(isErr(asCamelCase("PascalCase")));
});
