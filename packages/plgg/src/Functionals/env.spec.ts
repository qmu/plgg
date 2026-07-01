import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { env, box } from "plgg/index";

test("env - returns Ok for existing environment variable", () => {
  process.env.TEST_VAR = "test-value";
  const result = env(box("Str")("TEST_VAR"));
  const assertion = check(
    result,
    okThen(toBe("test-value")),
  );
  delete process.env.TEST_VAR;
  return assertion;
});

test("env - returns Err for missing environment variable", () => {
  delete process.env.NONEXISTENT_VAR;
  return check(
    env(box("Str")("NONEXISTENT_VAR")),
    errThen((e) =>
      all([
        check(
          e.content.message,
          toContain("NONEXISTENT_VAR"),
        ),
        check(
          e.content.message,
          toContain("not set"),
        ),
      ]),
    ),
  );
});

test("env - returns Err for empty environment variable", () => {
  process.env.EMPTY_VAR = "";
  const result = env(box("Str")("EMPTY_VAR"));
  const assertion = check(
    result,
    errThen((e) =>
      toContain("EMPTY_VAR")(e.content.message),
    ),
  );
  delete process.env.EMPTY_VAR;
  return assertion;
});

test("env - returns Err when process.env is unavailable", () => {
  const originalEnv = process.env;
  // @ts-expect-error test scenario: simulate missing process.env
  process.env = undefined;
  const result = env(box("Str")("ANY_VAR"));
  process.env = originalEnv;
  return check(
    result,
    errThen((e) =>
      toContain("process.env unavailable")(
        e.content.message,
      ),
    ),
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
  const result = env(box("Str")("ANY_VAR"));
  Object.defineProperty(process, "env", {
    value: originalEnv,
    writable: true,
    configurable: true,
  });
  return check(
    result,
    errThen((e) =>
      toContain("Failed to access")(
        e.content.message,
      ),
    ),
  );
});
