import { test, expect, assert } from "plgg-test";
import {
  isPascalCase,
  asPascalCase,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("isPascalCase and asPascalCase basic validation", () => {
  expect(
    isPascalCase(box("PascalCase")("PascalCase")),
  ).toBe(true);
  const result = asPascalCase("TestValue");
  assert(isOk(result));
  expect(result.content.content).toBe(
    "TestValue",
  );
  assert(isErr(asPascalCase("camelCase")));
});
