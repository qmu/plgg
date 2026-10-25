import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDist,
  parseLockEntry,
  pinnedTarballMatches,
  type TarballDist,
  type LockEntry,
} from "./pinnedTarball.ts";

test("parseDist reads tarball + integrity off one response", () => {
  assert.deepEqual(
    parseDist({
      tarball:
        "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
      integrity: "sha512-abc123==",
      shasum: "deadbeef",
    }),
    {
      tarball:
        "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
      integrity: "sha512-abc123==",
    },
  );
});

test("parseDist rejects a response missing either field", () => {
  assert.equal(
    parseDist({
      integrity: "sha512-abc123==",
    }),
    null,
  );
  assert.equal(
    parseDist({
      tarball:
        "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
    }),
    null,
  );
  assert.equal(parseDist({ tarball: "", integrity: "" }), null);
});

test("parseDist rejects non-object and non-string fields", () => {
  assert.equal(parseDist(null), null);
  assert.equal(parseDist("dist"), null);
  assert.equal(parseDist([]), null);
  assert.equal(
    parseDist({ tarball: 1, integrity: "sha512-x" }),
    null,
  );
});

test("parseLockEntry reads an installed package's resolved + integrity", () => {
  const lock = {
    packages: {
      "node_modules/plgg": {
        version: "0.0.27",
        resolved:
          "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
        integrity: "sha512-abc123==",
      },
    },
  };
  assert.deepEqual(parseLockEntry(lock, "plgg"), {
    resolved:
      "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
    integrity: "sha512-abc123==",
  });
});

test("parseLockEntry rejects an absent or partial entry", () => {
  assert.equal(
    parseLockEntry(
      { packages: { "node_modules/other": {} } },
      "plgg",
    ),
    null,
  );
  assert.equal(
    parseLockEntry(
      {
        packages: {
          "node_modules/plgg": {
            resolved:
              "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
          },
        },
      },
      "plgg",
    ),
    null,
  );
  assert.equal(parseLockEntry(null, "plgg"), null);
  assert.equal(
    parseLockEntry({ packages: null }, "plgg"),
    null,
  );
});

test("parseLockEntry scopes the lookup to the exact package key", () => {
  const lock = {
    packages: {
      "node_modules/plgg-bundle": {
        resolved:
          "https://registry.npmjs.org/plgg-bundle/-/plgg-bundle-0.0.7.tgz",
        integrity: "sha512-zzz==",
      },
    },
  };
  assert.equal(parseLockEntry(lock, "plgg"), null);
});

const dist: TarballDist = {
  tarball:
    "https://registry.npmjs.org/plgg/-/plgg-0.0.27.tgz",
  integrity: "sha512-abc123==",
};

test("pinnedTarballMatches is true when both fields agree", () => {
  const installed: LockEntry = {
    resolved: dist.tarball,
    integrity: dist.integrity,
  };
  assert.equal(pinnedTarballMatches(dist, installed), true);
});

test("pinnedTarballMatches rejects a URL-only match", () => {
  const installed: LockEntry = {
    resolved: dist.tarball,
    integrity: "sha512-different==",
  };
  assert.equal(pinnedTarballMatches(dist, installed), false);
});

test("pinnedTarballMatches rejects a hash-only match", () => {
  const installed: LockEntry = {
    resolved:
      "https://attacker.example/plgg/-/plgg-0.0.27.tgz",
    integrity: dist.integrity,
  };
  assert.equal(pinnedTarballMatches(dist, installed), false);
});

test("pinnedTarballMatches rejects a mismatch on both fields", () => {
  const installed: LockEntry = {
    resolved:
      "https://attacker.example/plgg/-/plgg-0.0.27.tgz",
    integrity: "sha512-different==",
  };
  assert.equal(pinnedTarballMatches(dist, installed), false);
});
