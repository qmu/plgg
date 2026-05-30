import { test, expect, assert } from "vitest";
import {
  isSnakeCase,
  asSnakeCase,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isSnakeCase and asSnakeCase basic validation", () => {
  expect(
    isSnakeCase(box("SnakeCase")("snake_case")),
  ).toBe(true);
  const result = asSnakeCase("test_value");
  assert(isOk(result));
  expect(result.content.content).toBe(
    "test_value",
  );
  assert(isErr(asSnakeCase("camelCase")));
});
