import { test, expect, assert } from "vitest";
import { isKebabCase, asKebabCase, isOk, isErr, newBox } from "plgg/index";

test("isKebabCase and asKebabCase basic validation", () => {
  expect(isKebabCase(newBox("KebabCase")("kebab-case"))).toBe(true);
  const result = asKebabCase("test-value");
  assert(isOk(result));
  expect(result.content.content).toBe("test-value");
  assert(isErr(asKebabCase("camelCase")));
});
