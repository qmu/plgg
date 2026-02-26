import { test, expect, assert } from "vitest";
import {
  isAlphanumeric,
  asAlphanumeric,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isAlphanumeric and asAlphanumeric basic validation", () => {
  expect(
    isAlphanumeric(
      box("Alphanumeric")("test123"),
    ),
  ).toBe(true);
  const result = asAlphanumeric("abc123");
  assert(isOk(result));
  expect(result.content.content).toBe("abc123");
  assert(isErr(asAlphanumeric("test-123")));
});
