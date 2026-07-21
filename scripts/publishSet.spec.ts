import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSemver,
  isNewer,
  computePublishSet,
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
