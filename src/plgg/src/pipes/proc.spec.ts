import { test, expect, assert } from "vitest";
import { lift, proc, isErr } from "plgg/index";

test("step with single function", async () => {
  const double = (x: number) => x * 2;

  const result = await proc(5, lift(double));
  if (isErr(result)) {
    assert.fail("Expected success, but got error");
  }
  expect(result.ok).toBe(10);
});
