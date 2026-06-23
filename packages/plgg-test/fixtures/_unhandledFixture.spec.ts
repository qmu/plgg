// Fixture: a test that starts a rejecting promise but never awaits it
// (fire-and-forget). The runner's unhandled-rejection window must fail
// this test rather than let the rejection escape. Loaded by
// Runner.spec.ts. Expected: 1 failed.
import { test, expect } from "plgg-test/index";

test("passes synchronously", () => {
  expect(1).toBe(1);
});

test("starts a fire-and-forget rejection", () => {
  // Not awaited on purpose — the rejection window should still catch it.
  void Promise.reject(
    new Error("escaped rejection"),
  );
  expect(1).toBe(1);
});
