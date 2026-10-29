import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkNodeEngine,
  checkTarballNodeEngine,
  gatePublishedFetch,
} from "./publicNodeEngine.ts";

const manifest = (node: unknown) => ({
  name: "plgg-fetch",
  version: "0.0.1",
  engines: { node },
});

test("accepts semver boundaries, alternatives and supported later majors", () => {
  for (const [range, version] of [
    [">=22.13", "22.13.0"],
    ["^22.13 || ^24", "24.2.0"],
    [">=22.13", "26.0.0"],
  ]) {
    assert.match(
      checkNodeEngine(
        manifest(range),
        version ?? "",
      ),
      /satisfies/,
    );
  }
});

test("rejects mismatches, prereleases and invalid runtime versions", () => {
  for (const version of [
    "22.12.0",
    "20.19.0",
    "24.0.0-rc.1",
    "invalid",
  ]) {
    assert.throws(
      () =>
        checkNodeEngine(
          manifest(">=22.13"),
          version,
        ),
      /plgg-fetch@0.0.1: Node .* does not satisfy engines.node >=22.13/,
    );
  }
});

test("fails closed on absent or invalid engines and identity", () => {
  for (const node of [
    undefined,
    null,
    24,
    "",
    " ",
    "banana",
  ]) {
    assert.throws(
      () =>
        checkNodeEngine(manifest(node), "24.0.0"),
      /missing or invalid engines.node/,
    );
  }
  assert.throws(
    () =>
      checkNodeEngine(
        { name: "plgg-fetch", version: "0.0.1" },
        "24.0.0",
      ),
    /missing or invalid engines.node/,
  );
  assert.throws(
    () => checkNodeEngine(null, "24.0.0"),
    /identity/,
  );
});

test("reads the packed manifest rather than workspace metadata", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "engine-test-"),
  );
  try {
    mkdirSync(join(directory, "package"));
    const archive = join(
      directory,
      "fixture.tgz",
    );
    writeFileSync(
      join(directory, "package/package.json"),
      JSON.stringify(manifest("^24")),
    );
    execFileSync("tar", [
      "-czf",
      archive,
      "-C",
      directory,
      "package",
    ]);
    assert.match(
      checkTarballNodeEngine(archive, "24.1.0"),
      /satisfies engines.node \^24/,
    );
    assert.throws(
      () =>
        checkTarballNodeEngine(
          archive,
          "22.23.4",
        ),
      /does not satisfy/,
    );
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("rejects non-registry selectors before invoking npm", () => {
  for (const version of [
    "../local",
    "https://example.com/a.tgz",
    "--help",
    "1.0.0;echo",
  ]) {
    assert.throws(
      () => gatePublishedFetch(version),
      /Expected latest or an exact/,
    );
  }
});
