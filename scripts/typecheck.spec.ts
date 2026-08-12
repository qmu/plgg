import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectNames,
  parseCheckArgs,
  tscBinFromMain,
  errorCountOf,
  failedProjects,
  exitCodeFor,
  summaryOf,
} from "./typecheck.ts";

/**
 * Unit tests for the whole-repo typecheck gate's pure helpers. The gate
 * itself is exercised end-to-end by check-all; what is worth pinning
 * here is the selection rule (which packages get checked), the launcher
 * derivation (which compiler checks a package), the diagnostic folding
 * of a spawned tsc's output, and the red/green folding.
 */

test("projectNames: only entries carrying a tsconfig, sorted", () => {
  assert.deepEqual(
    projectNames(
      ["plgg-view", "plgg", "no-config"],
      (n) => n !== "no-config",
      [],
    ),
    ["plgg", "plgg-view"],
  );
});

test("projectNames: an explicit request narrows the set", () => {
  assert.deepEqual(
    projectNames(
      ["plgg-view", "plgg", "plgg-kit"],
      () => true,
      ["plgg-kit"],
    ),
    ["plgg-kit"],
  );
});

test("projectNames: a requested package without a tsconfig is still skipped", () => {
  assert.deepEqual(
    projectNames(
      ["guide", "plgg"],
      (n) => n !== "guide",
      ["guide"],
    ),
    [],
  );
});

test("parseCheckArgs: --jobs is consumed, packages pass through", () => {
  assert.deepEqual(
    parseCheckArgs(
      ["plgg", "--jobs", "2", "plgg-view"],
      4,
    ),
    { jobs: 2, only: ["plgg", "plgg-view"] },
  );
});

test("parseCheckArgs: a malformed --jobs falls back to the default, its value slot still consumed", () => {
  assert.deepEqual(
    parseCheckArgs(["--jobs", "banana"], 4),
    { jobs: 4, only: [] },
  );
});

test("parseCheckArgs: no flags means default jobs, all packages", () => {
  assert.deepEqual(parseCheckArgs([], 8), {
    jobs: 8,
    only: [],
  });
});

test("tscBinFromMain: the TS6 main (lib/typescript.js) maps to its bin/tsc", () => {
  assert.equal(
    tscBinFromMain(
      "/repo/packages/plgg-bundle/node_modules/typescript/lib/typescript.js",
    ),
    "/repo/packages/plgg-bundle/node_modules/typescript/bin/tsc",
  );
});

test("tscBinFromMain: the TS7 main (lib/version.cjs) maps to its bin/tsc", () => {
  assert.equal(
    tscBinFromMain(
      "/repo/node_modules/typescript/lib/version.cjs",
    ),
    "/repo/node_modules/typescript/bin/tsc",
  );
});

test("errorCountOf: counts diagnostics through ANSI color", () => {
  const colored =
    "src/a.ts:1:1 - \u001b[91merror\u001b[0m\u001b[90m TS2322: \u001b[0mboom\n" +
    "src/a.ts:9:1 - \u001b[91merror\u001b[0m\u001b[90m TS2345: \u001b[0malso\n";
  assert.equal(errorCountOf(colored, 1), 2);
});

test("errorCountOf: a clean exit with no diagnostics is zero", () => {
  assert.equal(errorCountOf("", 0), 0);
});

test("errorCountOf: a compiler crash without diagnostics still fails", () => {
  assert.equal(
    errorCountOf("segfault, no TS lines", 134),
    1,
  );
});

test("failedProjects: names every package with errors, in order", () => {
  assert.deepEqual(
    failedProjects([
      { name: "a", errorCount: 0, seconds: 1 },
      { name: "b", errorCount: 2, seconds: 1 },
      { name: "c", errorCount: 1, seconds: 1 },
    ]),
    ["b", "c"],
  );
});

test("exitCodeFor: green is 0, any error is 1", () => {
  assert.equal(
    exitCodeFor([
      { name: "a", errorCount: 0, seconds: 1 },
    ]),
    0,
  );
  assert.equal(
    exitCodeFor([
      { name: "a", errorCount: 0, seconds: 1 },
      { name: "b", errorCount: 1, seconds: 1 },
    ]),
    1,
  );
});

test("summaryOf: a clean run says so and counts the packages", () => {
  assert.equal(
    summaryOf(
      [
        { name: "a", errorCount: 0, seconds: 1 },
        { name: "b", errorCount: 0, seconds: 1 },
      ],
      12.34,
    ),
    "typecheck: 2 packages in 12.3s — all clean\n",
  );
});

test("summaryOf: a red run names every failing package", () => {
  assert.equal(
    summaryOf(
      [
        { name: "a", errorCount: 3, seconds: 1 },
        { name: "b", errorCount: 0, seconds: 1 },
        { name: "c", errorCount: 1, seconds: 1 },
      ],
      9,
    ),
    "typecheck: 3 packages in 9.0s — FAILED in 2: a, c\n",
  );
});
