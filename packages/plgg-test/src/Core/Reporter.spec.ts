import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "../index.js";
import {
  tally,
  exitCodeFor,
  report,
} from "./Reporter.js";
import type { TestResult } from "./types.js";

const r = (
  outcome: TestResult["outcome"],
  message = "",
): TestResult => ({
  names: ["t"],
  outcome,
  durationMs: 0,
  message,
  stack: "",
});

test("tally counts each outcome", () => {
  const v = tally([
    r("passed"),
    r("passed"),
    r("failed", "x"),
    r("skipped"),
  ]);
  return all([
    check(v.passed, toBe(2)),
    check(v.failed, toBe(1)),
    check(v.skipped, toBe(1)),
  ]);
});

test("exit code is 1 on any failure", () =>
  check(
    exitCodeFor({
      passed: 5,
      failed: 1,
      skipped: 0,
    }),
    toBe(1),
  ));

test("exit code is 0 on all-pass with tests", () =>
  check(
    exitCodeFor({
      passed: 3,
      failed: 0,
      skipped: 1,
    }),
    toBe(0),
  ));

test("exit code is 1 when nothing ran", () =>
  check(
    exitCodeFor({
      passed: 0,
      failed: 0,
      skipped: 0,
    }),
    toBe(1),
  ));

test("report lists failures and a summary", () => {
  const text = report([
    r("passed"),
    r("failed", "boom"),
  ]);
  return all([
    check(text, toContain("✗")),
    check(text, toContain("boom")),
    check(text, toContain("1 passed, 1 failed")),
  ]);
});

test("report notes empty runs", () =>
  check(
    report([]),
    toContain("no tests were executed"),
  ));
