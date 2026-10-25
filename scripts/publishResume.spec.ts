import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planResume,
  resumeCommand,
  resumeReport,
  type PkgRef,
} from "./publishResume.ts";

const order: ReadonlyArray<PkgRef> = [
  { dir: "plgg-bundle", name: "plgg-bundle", version: "0.0.7" },
  { dir: "plgg", name: "plgg", version: "1.2.0" },
  { dir: "plgg-view", name: "plgg-view", version: "0.0.3" },
  { dir: "plgg-cms", name: "plgg-cms", version: "0.4.0" },
];

test("planResume: failure before any publish succeeded", () => {
  const plan = planResume(order, "plgg-bundle", "publish");
  assert.deepEqual(plan.completed, []);
  assert.equal(plan.failed.pkg.dir, "plgg-bundle");
  assert.equal(plan.failed.stage, "publish");
  assert.deepEqual(
    plan.pending.map((p) => p.dir),
    ["plgg", "plgg-view", "plgg-cms"],
  );
  assert.equal(plan.failedIsOnRegistry, false);
});

test("planResume: failure partway through, at the publish step", () => {
  const plan = planResume(order, "plgg-view", "publish");
  assert.deepEqual(
    plan.completed.map((p) => p.dir),
    ["plgg-bundle", "plgg"],
  );
  assert.equal(plan.failed.pkg.dir, "plgg-view");
  assert.deepEqual(
    plan.pending.map((p) => p.dir),
    ["plgg-cms"],
  );
  assert.equal(plan.failedIsOnRegistry, false);
});

test("planResume: resolve/smoke failures mean the publish already landed", () => {
  assert.equal(
    planResume(order, "plgg-view", "resolve").failedIsOnRegistry,
    true,
  );
  assert.equal(
    planResume(order, "plgg-view", "smoke").failedIsOnRegistry,
    true,
  );
});

test("planResume: failure on the last package leaves nothing pending", () => {
  const plan = planResume(order, "plgg-cms", "smoke");
  assert.deepEqual(plan.pending, []);
  assert.deepEqual(
    plan.completed.map((p) => p.dir),
    ["plgg-bundle", "plgg", "plgg-view"],
  );
});

test("planResume: an unknown dir throws rather than silently resuming wrong", () => {
  assert.throws(() =>
    planResume(order, "plgg-nonexistent", "publish"),
  );
});

test("resumeCommand: a publish-stage failure includes the failed package itself", () => {
  const plan = planResume(order, "plgg-view", "publish");
  assert.equal(
    resumeCommand(plan),
    "ONLY=plgg-view,plgg-cms ./scripts/publish-npm.sh",
  );
});

test("resumeCommand: a post-publish failure excludes the already-landed package", () => {
  const plan = planResume(order, "plgg-view", "smoke");
  assert.equal(
    resumeCommand(plan),
    "ONLY=plgg-cms ./scripts/publish-npm.sh",
  );
});

test("resumeCommand: nothing left to publish after the last package lands", () => {
  const plan = planResume(order, "plgg-cms", "resolve");
  assert.equal(
    resumeCommand(plan),
    "(nothing left to publish — resolve the failed package by hand)",
  );
});

test("resumeReport: names what already shipped and only ever warns against unpublish", () => {
  const plan = planResume(order, "plgg-view", "smoke");
  const report = resumeReport(plan);
  assert.match(report, /plgg-bundle@0\.0\.7/);
  assert.match(report, /plgg@1\.2\.0/);
  assert.match(report, /plgg-view@0\.0\.3/);
  assert.match(report, /npm deprecate/);
  assert.match(report, /ONLY=plgg-cms/);
  // "npm unpublish" appears only inside the explicit prohibition, never as
  // something to actually run.
  assert.match(report, /do not .npm unpublish./);
  assert.doesNotMatch(report, /run `npm unpublish/i);
});

test("resumeReport: a pre-publish failure says it is safe to retry as-is", () => {
  const plan = planResume(order, "plgg", "publish");
  const report = resumeReport(plan);
  assert.match(report, /is NOT on the registry/);
  assert.match(report, /safe to retry exactly as staged/);
  assert.doesNotMatch(report, /npm deprecate/);
});

test("resumeReport: nothing published yet is stated plainly", () => {
  const plan = planResume(order, "plgg-bundle", "publish");
  assert.match(
    resumeReport(plan),
    /Nothing published yet this run\./,
  );
});
