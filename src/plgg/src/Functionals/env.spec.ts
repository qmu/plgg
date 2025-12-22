import { test, expect, assert } from "vitest";
import { env, isOk, isErr } from "plgg/index";

test("env - returns Ok for existing environment variable", () => {
  process.env.TEST_VAR = "test-value";
  const result = env("TEST_VAR");
  assert(isOk(result));
  expect(result.content).toBe("test-value");
  delete process.env.TEST_VAR;
});

test("env - returns Err for missing environment variable", () => {
  delete process.env.NONEXISTENT_VAR;
  const result = env("NONEXISTENT_VAR");
  assert(isErr(result));
  expect(result.content.message).toContain(
    "NONEXISTENT_VAR",
  );
  expect(result.content.message).toContain(
    "not set",
  );
});

test("env - returns Err for empty environment variable", () => {
  process.env.EMPTY_VAR = "";
  const result = env("EMPTY_VAR");
  assert(isErr(result));
  expect(result.content.message).toContain(
    "EMPTY_VAR",
  );
  delete process.env.EMPTY_VAR;
});
