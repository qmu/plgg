import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  savePublishedCompletion,
  snapshot,
} from "./savePublishedCompletion.mjs";

function fixture() {
  return {
    schemaVersion: 1,
    checkedAt: "2026-10-25T10:00:00.000Z",
    registry: "https://registry.npmjs.org",
    node: "v24.22.1",
    consumerCompilers: { ts7: "7.0.2" },
    complete: true,
    packages: ["plgg", "plgg-bundle", "plgg-view"].map((name) => ({
      name,
      version: "0.0.1",
      sha256: "a".repeat(64),
      sha512: `sha512-${Buffer.alloc(64).toString("base64")}`,
    })),
    checks: [
      "bundle-restart",
      "consumer-ts7",
      "svg-elements",
      "raw-identity",
      "frame-dispatch",
      "lazy-subtree",
    ].map((id) => ({ id, status: "passed" })),
  };
}
const bytes = (value) => Buffer.from(JSON.stringify(value));
function workspace(run) {
  const dir = mkdtempSync(join(tmpdir(), "plgg-final-save-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("one saved snapshot binds exact input bytes, runtime, compiler, versions and hashes", () =>
  workspace((dir) => {
    const input = join(dir, "input.json"),
      output = join(dir, "final.json");
    const source = bytes(fixture());
    writeFileSync(input, source);
    const saved = savePublishedCompletion(input, output);
    assert.equal(saved.complete, true);
    assert.equal(saved.node, "v24.22.1");
    assert.equal(saved.consumerTypeScript, "7.0.2");
    assert.equal(saved.packages.length, 3);
    assert.equal(
      saved.sourceSha256,
      createHash("sha256").update(source).digest("hex"),
    );
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), saved);
    assert.equal(statSync(output).mode & 0o777, 0o600);
  }));

test("completion cannot survive malformed, missing, duplicate or incompatible evidence", () => {
  const mutations = [
    (x) => {
      x.node = "v22.23.4";
    },
    (x) => {
      x.consumerCompilers.ts7 = "6.0.3";
    },
    (x) => {
      x.schemaVersion = 2;
    },
    (x) => {
      x.packages.pop();
    },
    (x) => {
      x.packages[1] = x.packages[0];
    },
    (x) => {
      x.packages[0].sha256 = "invalid";
    },
    (x) => {
      x.packages[0].sha512 = "invalid";
    },
    (x) => {
      x.checks[1] = x.checks[0];
    },
    (x) => {
      x.checks[0].status = "failed";
    },
    (x) => {
      x.complete = false;
    },
    (x) => {
      x.infrastructure = "blocked";
    },
    (x) => {
      x.registry = "https://example.com";
    },
  ];
  for (const mutate of mutations) {
    const value = fixture();
    mutate(value);
    assert.equal(snapshot(bytes(value)).complete, false);
  }
  for (const invalid of ["{", "null", "[]"])
    assert.equal(snapshot(Buffer.from(invalid)).complete, false);
});

test("failed evidence replaces stale success without forwarding diagnostics or unknown fields", () =>
  workspace((dir) => {
    const input = join(dir, "input.json"),
      output = join(dir, "final.json");
    writeFileSync(input, bytes(fixture()));
    savePublishedCompletion(input, output);
    const value = fixture();
    value.checks[0].status = "blocked";
    value.diagnostic = "PRIVATE-SENTINEL";
    value.packages[0].extra = "PRIVATE-SENTINEL";
    writeFileSync(input, bytes(value));
    savePublishedCompletion(input, output);
    assert.equal(JSON.parse(readFileSync(output, "utf8")).complete, false);
    assert.equal(
      readFileSync(output, "utf8").includes("PRIVATE-SENTINEL"),
      false,
    );
    writeFileSync(input, "{");
    savePublishedCompletion(input, output);
    assert.equal(
      JSON.parse(readFileSync(output, "utf8")).reason,
      "invalid-evidence",
    );
  }));

test("rename failure leaves prior whole snapshot, closes staging file and removes temporary bytes", () =>
  workspace((dir) => {
    const input = join(dir, "input.json"),
      output = join(dir, "final.json");
    writeFileSync(input, bytes(fixture()));
    writeFileSync(output, "previous-snapshot");
    assert.throws(() =>
      savePublishedCompletion(input, output, (temporary, destination) => {
        assert.equal(readFileSync(destination, "utf8"), "previous-snapshot");
        assert.equal(
          JSON.parse(readFileSync(temporary, "utf8")).complete,
          true,
        );
        throw Error("injected-rename-failure");
      }),
    );
    assert.equal(readFileSync(output, "utf8"), "previous-snapshot");
    assert.deepEqual(readdirSync(dir).sort(), ["final.json", "input.json"]);
    assert.throws(() => savePublishedCompletion(input, input));
  }));

test("CLI succeeds only after persistence and exits nonzero for rejection and IO failure", () =>
  workspace((dir) => {
    const input = join(dir, "input.json"),
      output = join(dir, "final.json");
    const run = (destination) =>
      spawnSync(
        process.execPath,
        ["scripts/savePublishedCompletion.mjs", input, destination],
        { encoding: "utf8" },
      );
    writeFileSync(input, bytes(fixture()));
    assert.equal(run(output).status, 0);
    writeFileSync(input, "{");
    assert.equal(run(output).status, 1);
    assert.equal(JSON.parse(readFileSync(output, "utf8")).complete, false);
    assert.equal(run(dir).status, 1);
    assert.equal(
      readdirSync(dir).some((name) => name.endsWith(".tmp")),
      false,
    );
  }));
