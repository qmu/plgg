import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectNames,
  settingsKey,
  buildInfoPath,
  failedProjects,
  exitCodeFor,
  summaryOf,
} from "./typecheck.ts";

/**
 * Unit tests for the whole-repo typecheck gate's pure helpers. The gate
 * itself is exercised end-to-end by check-all; what is worth pinning
 * here is the selection rule (which packages get checked), the cache
 * key (whose whole job is to NOT let two differently-configured
 * packages share a parsed file), and the red/green folding.
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

test("settingsKey: differing lib must not share a cache entry", () => {
  const nodeOnly = settingsKey({
    lib: ["lib.es2021.d.ts"],
  });
  const withDom = settingsKey({
    lib: ["lib.es2021.d.ts", "lib.dom.d.ts"],
  });
  assert.notEqual(nodeOnly, withDom);
});

test("settingsKey: differing module resolution must not share a cache entry", () => {
  assert.notEqual(
    settingsKey({ module: 199 }),
    settingsKey({ module: 99 }),
  );
});

test("settingsKey: options irrelevant to parsing do not split the cache", () => {
  assert.equal(
    settingsKey({ target: 8, rootDir: "src" }),
    settingsKey({ target: 8, rootDir: "lib" }),
  );
});

test("buildInfoPath: lands under the package's ignored node_modules cache", () => {
  assert.equal(
    buildInfoPath("/repo/packages", "plgg"),
    "/repo/packages/plgg/node_modules/.cache/typecheck.tsbuildinfo",
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
