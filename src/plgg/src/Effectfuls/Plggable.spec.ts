import { test, expect, assert } from "vitest";
import { isResult, success, fail, isOk } from "plgg/index";

test("success creates successful Plggable", async () => {
  const result = await success("test value");
  assert(isOk(result));
  expect(result.ok).toBe("test value");
});

test("fail creates failed Plggable", async () => {
  const err = new Error("test error");
  const result = await fail(err);
  if (!isResult(result) || isOk(result)) {
    assert.fail("Expected error, but got success");
  }
  expect(result.err).toBe(err);
});
