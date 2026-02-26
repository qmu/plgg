import { test, expect, assert } from "vitest";
import {
  isCamelCase,
  asCamelCase,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isCamelCase and asCamelCase basic validation", () => {
  expect(
    isCamelCase(box("CamelCase")("camelCase")),
  ).toBe(true);
  const result = asCamelCase("testValue");
  assert(isOk(result));
  expect(result.content.content).toBe(
    "testValue",
  );
  assert(isErr(asCamelCase("PascalCase")));
});
