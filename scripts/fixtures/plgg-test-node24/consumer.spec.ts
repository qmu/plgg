import {
  check,
  test,
  toBe,
} from "plgg-test";

// An enum requires transpilation; Node's type stripping alone cannot run it.
enum Answer {
  value = 42,
}

test("transpiles a consumer enum", () =>
  check(Answer.value, toBe(42)),
);
