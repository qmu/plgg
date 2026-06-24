// Fixture: a mixed run (1 pass, 2 fail) for Runner.spec to tally.
// Loaded by Runner.spec.ts.
import {
  test,
  check,
  toBe,
} from "plgg-test/index";

test("passes", () => check(1, toBe(1)));

test("fails on value mismatch", () =>
  check(1, toBe(2)));

test("fails by async rejection", async () => {
  await Promise.reject(new Error("boom"));
  return check(1, toBe(1));
});
