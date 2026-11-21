import { check, test, toBe } from "plgg-test";

// Native type stripping cannot execute enums; this exercises transpileModule.
enum Answer {
  value = 42,
}
test("public runner transpiles enum", () =>
  check(Answer.value, toBe(42)));
