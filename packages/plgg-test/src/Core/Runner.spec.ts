import { test, expect } from "plgg-test/index";
import { runFile } from "plgg-test/Core/Runner";
import { tally } from "plgg-test/Core/Reporter";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixture = (name: string): string =>
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "fixtures",
    name,
  );

test("runs a mixed fixture: pass/fail/skip + async reject", async () => {
  const results = await runFile(
    fixture("_metaFixture.spec.ts"),
  );
  const v = tally(results);
  expect(v.passed).toBe(1);
  expect(v.failed).toBe(2);
});

test("hooks run around each test in order", async () => {
  const results = await runFile(
    fixture("_hooksFixture.spec.ts"),
  );
  const v = tally(results);
  // The fixture asserts hook ordering internally; all its tests pass.
  expect(v.failed).toBe(0);
  expect(v.passed).toBe(2);
});

test("describe nesting and skip", async () => {
  const results = await runFile(
    fixture("_nestingFixture.spec.ts"),
  );
  const v = tally(results);
  expect(v.skipped).toBe(1);
  expect(v.passed).toBe(2);
});

test("a spec that fails to load turns red", async () => {
  const results = await runFile(
    fixture("_loadErrorFixture.spec.ts"),
  );
  const v = tally(results);
  expect(v.failed).toBe(1);
});

test("a fire-and-forget rejection fails the test (O2 window)", async () => {
  const results = await runFile(
    fixture("_unhandledFixture.spec.ts"),
  );
  const v = tally(results);
  expect(v.passed).toBe(1);
  expect(v.failed).toBe(1);
});
