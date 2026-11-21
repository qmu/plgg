import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSemver,
  isNewer,
  computePublishSet,
  isRemoteBaseline,
  driftedPackages,
  type PkgMeta,
} from "./publishSet.ts";

test("parseSemver splits and coerces components", () => {
  assert.deepEqual(parseSemver("1.2.3"), [1, 2, 3]);
  assert.deepEqual(parseSemver("0.0.6"), [0, 0, 6]);
  // Missing / non-numeric components coerce to 0 (shell `|| 0` parity).
  assert.deepEqual(parseSemver("2"), [2, 0, 0]);
  assert.deepEqual(parseSemver("1.x.4"), [1, 0, 4]);
});

test("isNewer: local strictly greater publishes", () => {
  assert.equal(isNewer([0, 0, 7], [0, 0, 6]), true);
  assert.equal(isNewer([0, 1, 0], [0, 0, 9]), true);
  assert.equal(isNewer([1, 0, 0], [0, 9, 9]), true);
});

test("isNewer: equal or lower skips", () => {
  assert.equal(isNewer([0, 0, 6], [0, 0, 6]), false);
  assert.equal(isNewer([0, 0, 5], [0, 0, 6]), false);
  assert.equal(isNewer([0, 9, 9], [1, 0, 0]), false);
});

test("isNewer: absent remote always publishes", () => {
  assert.equal(isNewer([0, 0, 1], null), true);
  assert.equal(isNewer([0, 0, 0], null), true);
});

test("computePublishSet buckets by version and privacy", () => {
  const order: ReadonlyArray<PkgMeta> = [
    {
      dir: "plgg-bundle",
      name: "plgg-bundle",
      version: "0.0.7",
      private: false,
    },
    {
      dir: "plgg",
      name: "plgg",
      version: "0.0.6",
      private: false,
    },
    {
      dir: "plgg-new",
      name: "plgg-new",
      version: "0.0.1",
      private: false,
    },
    {
      dir: "example",
      name: "@plgg/example",
      version: "1.0.0",
      private: true,
    },
  ];
  const remote = new Map<string, string | null>([
    ["plgg-bundle", "0.0.6"],
    ["plgg", "0.0.6"],
    ["plgg-new", null],
  ]);
  const decision = computePublishSet(order, remote);
  assert.deepEqual(
    decision.publish.map((p) => p.name),
    ["plgg-bundle", "plgg-new"],
  );
  assert.deepEqual(
    decision.skip.map((p) => p.name),
    ["plgg"],
  );
  assert.deepEqual(
    decision.privateSkipped.map((p) => p.name),
    ["@plgg/example"],
  );
});

test("computePublishSet treats an unqueried name as never published", () => {
  const order: ReadonlyArray<PkgMeta> = [
    {
      dir: "plgg-x",
      name: "plgg-x",
      version: "0.0.1",
      private: false,
    },
  ];
  const decision = computePublishSet(
    order,
    new Map<string, string | null>(),
  );
  assert.deepEqual(
    decision.publish.map((p) => p.name),
    ["plgg-x"],
  );
});

test("isRemoteBaseline accepts a flat name->version-or-null object", () => {
  assert.equal(
    isRemoteBaseline({
      plgg: "0.0.27",
      "plgg-bundle": null,
    }),
    true,
  );
  assert.equal(isRemoteBaseline({}), true);
});

test("isRemoteBaseline rejects non-object, array, and non-string/null values", () => {
  assert.equal(isRemoteBaseline(null), false);
  assert.equal(isRemoteBaseline("plgg"), false);
  assert.equal(isRemoteBaseline(["plgg"]), false);
  assert.equal(
    isRemoteBaseline({ plgg: 27 }),
    false,
  );
  assert.equal(
    isRemoteBaseline({ plgg: undefined }),
    false,
  );
});

test("driftedPackages: unchanged baseline drifts nothing", () => {
  const baseline = { plgg: "0.0.27", "plgg-bundle": null };
  const current = { plgg: "0.0.27", "plgg-bundle": null };
  assert.deepEqual(
    driftedPackages(
      ["plgg", "plgg-bundle"],
      baseline,
      current,
    ),
    [],
  );
});

test("driftedPackages: a moved latest version is drift", () => {
  const baseline = { plgg: "0.0.27" };
  const current = { plgg: "0.0.28" };
  assert.deepEqual(
    driftedPackages(["plgg"], baseline, current),
    ["plgg"],
  );
});

test("driftedPackages: a newly-published name is drift too", () => {
  const baseline = { "plgg-new": null };
  const current = { "plgg-new": "0.0.1" };
  assert.deepEqual(
    driftedPackages(["plgg-new"], baseline, current),
    ["plgg-new"],
  );
});

test("driftedPackages: a name absent from a side reads as null", () => {
  const baseline = {};
  const current = { "plgg-new": "0.0.1" };
  assert.deepEqual(
    driftedPackages(["plgg-new"], baseline, current),
    ["plgg-new"],
  );
  assert.deepEqual(
    driftedPackages(
      ["plgg-new"],
      { "plgg-new": null },
      {},
    ),
    [],
  );
});

test("driftedPackages: only checks the names given, not every baseline key", () => {
  const baseline = { plgg: "0.0.27", "plgg-view": "0.0.2" };
  const current = { plgg: "0.0.27", "plgg-view": "9.9.9" };
  assert.deepEqual(
    driftedPackages(["plgg"], baseline, current),
    [],
  );
});
