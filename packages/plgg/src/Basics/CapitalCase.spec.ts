import { test, expect, assert } from "vitest";
import {
  isCapitalCase,
  asCapitalCase,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isCapitalCase and asCapitalCase basic validation", () => {
  expect(
    isCapitalCase(
      box("CapitalCase")("Capital Case"),
    ),
  ).toBe(true);
  const result = asCapitalCase("Test Value");
  assert(isOk(result));
  expect(result.content.content).toBe(
    "Test Value",
  );
  assert(isErr(asCapitalCase("lowercase")));
});
