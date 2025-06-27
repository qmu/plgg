import { test, expect, assert } from "vitest";
import { success, fail, isOk, isErr } from "plgg/index";

test("success creates successful Procedural", async () => {
  const result = await success("test value");
  assert(isOk(result));
  expect(result.ok).toBe("test value");
});

test("fail creates failed Procedural", async () => {
  const result = await fail("test error");
  assert(isErr(result));
  expect(result.err).toBe("test error");
});

