import { test, expect, assert } from "vitest";
import { lift, proc, isErr, handle, ValidationError } from "plgg/index";

test("handle", async () => {
  const double = (x: number) => x * 2;

  const result = await handle(
    proc(5, lift(double)),
    (e) => new ValidationError("Error occurred", e),
  );

  if (isErr(result)) {
    assert.fail("Expected success, but got error");
  }
  expect(result.ok).toBe(10);
});
