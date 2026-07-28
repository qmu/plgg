import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRunArgs,
  defaultJobs,
  isStandardTestScript,
  testablePackages,
  orderByCost,
  failureBlock,
  failedPackages,
  exitCodeFor,
  summaryOf,
  TYPECHECK_JOB,
} from "./runTests.ts";

/**
 * Unit tests for the canonical runner's pure helpers. The fan-out
 * itself is exercised by check-all; what is pinned here is everything a
 * bug in would make the gate quietly WEAKER — which packages get run,
 * whether a drifted test script is noticed, and whether a red package
 * still produces a non-zero exit and a named block.
 */

const result = (
  name: string,
  ok: boolean,
  seconds = 1,
  output = "",
) => ({ name, ok, seconds, output });

test("parseRunArgs: bare invocation takes the default concurrency", () => {
  const a = parseRunArgs([], 6);
  assert.equal(a.jobs, 6);
  assert.equal(a.coverage, false);
  assert.equal(a.typecheck, false);
  assert.deepEqual(a.only, []);
});

test("parseRunArgs: flags and an explicit job count", () => {
  const a = parseRunArgs(
    ["--coverage", "--typecheck", "--jobs", "3"],
    6,
  );
  assert.equal(a.jobs, 3);
  assert.equal(a.coverage, true);
  assert.equal(a.typecheck, true);
});

test("parseRunArgs: a bad --jobs value falls back, never serializes", () => {
  assert.equal(
    parseRunArgs(["--jobs", "zero"], 6).jobs,
    6,
  );
  assert.equal(
    parseRunArgs(["--jobs", "0"], 6).jobs,
    6,
  );
  assert.equal(
    parseRunArgs(["--jobs", "-4"], 6).jobs,
    6,
  );
  assert.equal(parseRunArgs(["--jobs"], 6).jobs, 6);
});

test("parseRunArgs: the --jobs value is not mistaken for a package name", () => {
  assert.deepEqual(
    parseRunArgs(["--jobs", "3", "plgg"], 6).only,
    ["plgg"],
  );
});

test("defaultJobs: a little above the core count", () => {
  assert.equal(defaultJobs(4), 6);
  assert.equal(defaultJobs(16), 18);
});

test("isStandardTestScript: both sanctioned shapes are accepted", () => {
  assert.equal(
    isStandardTestScript("plgg-test src"),
    true,
  );
  assert.equal(
    isStandardTestScript(
      "node ./bin/plgg-test.mjs src",
    ),
    true,
  );
});

test("isStandardTestScript: a drifted script is NOT silently run", () => {
  assert.equal(
    isStandardTestScript("vitest run"),
    false,
  );
  assert.equal(
    isStandardTestScript(
      "tsc --noEmit && plgg-test src",
    ),
    false,
  );
  assert.equal(
    isStandardTestScript("plgg-test test"),
    false,
  );
  assert.equal(isStandardTestScript(undefined), false);
});

test("testablePackages: only packages declaring a test script", () => {
  assert.deepEqual(
    testablePackages(
      ["plgg-view", "guide", "plgg"],
      (n) =>
        n === "guide" ? undefined : "plgg-test src",
      [],
    ),
    ["plgg", "plgg-view"],
  );
});

test("testablePackages: an explicit list narrows the run", () => {
  assert.deepEqual(
    testablePackages(
      ["plgg-view", "plgg"],
      () => "plgg-test src",
      ["plgg"],
    ),
    ["plgg"],
  );
});

test("orderByCost: slowest first, ties broken by name", () => {
  const cost = new Map([
    ["a", 1],
    ["b", 10],
    ["c", 10],
  ]);
  assert.deepEqual(
    orderByCost(
      ["a", "b", "c"],
      (n) => cost.get(n) ?? 0,
    ),
    ["b", "c", "a"],
  );
});

test("orderByCost: the typecheck gate is dispatched before every suite", () => {
  assert.equal(
    orderByCost(
      ["plgg-bundle", TYPECHECK_JOB, "plgg"],
      (n) =>
        n === TYPECHECK_JOB
          ? Number.MAX_SAFE_INTEGER
          : 999,
    )[0],
    TYPECHECK_JOB,
  );
});

test("failedPackages / exitCodeFor: a red package fails the run", () => {
  const rs = [
    result("plgg", true),
    result("plgg-view", false),
  ];
  assert.deepEqual(failedPackages(rs), [
    "plgg-view",
  ]);
  assert.equal(exitCodeFor(rs), 1);
});

test("exitCodeFor: an all-green run exits 0", () => {
  assert.equal(
    exitCodeFor([result("plgg", true)]),
    0,
  );
});

test("failureBlock: names the package and replays its output", () => {
  const block = failureBlock(
    result(
      "plgg-view",
      false,
      2.5,
      "1 failed\n  renders > mounts",
    ),
  );
  assert.match(
    block,
    /=== FAILED packages\/plgg-view \(2\.5s\) ===/,
  );
  assert.match(block, /renders > mounts/);
  assert.match(
    block,
    /=== end packages\/plgg-view ===/,
  );
});

test("summaryOf: a green phase reports the wall clock", () => {
  assert.equal(
    summaryOf(
      [result("plgg", true)],
      33.75,
      6,
    ),
    "test phase: 1 checks in 33.8s (jobs=6) — all green\n",
  );
});

test("summaryOf: a red phase names every failing package", () => {
  assert.equal(
    summaryOf(
      [
        result("plgg", false),
        result("plgg-view", true),
        result("plgg-kit", false),
      ],
      9,
      4,
    ),
    "test phase: 3 checks in 9.0s (jobs=4) — FAILED in 2: plgg, plgg-kit\n",
  );
});
