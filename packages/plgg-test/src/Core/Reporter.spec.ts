import { test, expect } from "plgg-test/index";
import {
  tally,
  exitCodeFor,
  report,
} from "plgg-test/Core/Reporter";
import type { TestResult } from "plgg-test/Core/types";

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
  expect(v.passed).toBe(2);
  expect(v.failed).toBe(1);
  expect(v.skipped).toBe(1);
});

test("exit code is 1 on any failure", () => {
  expect(
    exitCodeFor({
      passed: 5,
      failed: 1,
      skipped: 0,
    }),
  ).toBe(1);
});

test("exit code is 0 on all-pass with tests", () => {
  expect(
    exitCodeFor({
      passed: 3,
      failed: 0,
      skipped: 1,
    }),
  ).toBe(0);
});

test("exit code is 1 when nothing ran", () => {
  expect(
    exitCodeFor({
      passed: 0,
      failed: 0,
      skipped: 0,
    }),
  ).toBe(1);
});

test("report lists failures and a summary", () => {
  const text = report([
    r("passed"),
    r("failed", "boom"),
  ]);
  expect(text).toContain("✗");
  expect(text).toContain("boom");
  expect(text).toContain("1 passed, 1 failed");
});

test("report notes empty runs", () => {
  expect(report([])).toContain(
    "no tests were executed",
  );
});
