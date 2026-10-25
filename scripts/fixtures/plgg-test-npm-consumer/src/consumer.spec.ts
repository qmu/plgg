import {
  check,
  test,
  toBe,
} from "plgg-test";

// An enum requires transpilation; Node's type stripping alone cannot run it,
// so this test only passes when plgg-test's nested TypeScript 6 is used.
enum Answer {
  value = 42,
}

test("transpiles a consumer enum", () =>
  check(Answer.value, toBe(42)),
);
