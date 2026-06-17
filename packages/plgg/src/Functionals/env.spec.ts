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
  expect(result.content.content.message).toContain(
    "NONEXISTENT_VAR",
  );
  expect(result.content.content.message).toContain(
    "not set",
  );
});

test("env - returns Err for empty environment variable", () => {
  process.env.EMPTY_VAR = "";
  const result = env("EMPTY_VAR");
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "EMPTY_VAR",
  );
  delete process.env.EMPTY_VAR;
});

test("env - returns Err when process.env is unavailable", () => {
  const originalEnv = process.env;
  // @ts-expect-error test scenario: simulate missing process.env
  process.env = undefined;
  const result = env("ANY_VAR");
  process.env = originalEnv;
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "process.env unavailable",
  );
});

test("env - returns Err when accessing process throws", () => {
  const originalEnv = process.env;
  Object.defineProperty(process, "env", {
    get() {
      throw new Error("blocked");
    },
    configurable: true,
  });
  const result = env("ANY_VAR");
  Object.defineProperty(process, "env", {
    value: originalEnv,
    writable: true,
    configurable: true,
  });
  assert(isErr(result));
  expect(result.content.content.message).toContain(
    "Failed to access",
  );
});
