// Fixture consumed by the meta-harness (src/Core/_meta.ts) to prove
// the runner's verdict + exit-code behavior. It DELIBERATELY contains
// failing tests, so it lives under `fixtures/` (outside `src`) and is
// never picked up by the normal self-test discovery — only loaded by
// the meta-harness via an explicit path.
import { test, expect } from "plgg-test/index";

test("passes", () => {
  expect(1).toBe(1);
});

test("fails synchronously", () => {
  expect(1).toBe(2);
});

test("fails by async rejection", async () => {
  await Promise.reject(new Error("boom"));
});
