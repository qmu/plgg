import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectPublicGateIndex,
  writePublicGateIndex,
  type Gate,
} from "./publicGateIndex.ts";

const fixture = (
  run: (root: string) => void,
): void => {
  const root = mkdtempSync(
    join(tmpdir(), "public-gate-index-"),
  );
  try {
    run(root);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
};

const gate = (name: string): Gate => ({
  package: name,
  executable: process.execPath,
  script: `${name}.mjs`,
  args: [],
  env: { INDEX_GATE_OPT_IN: "1" },
  command: `node ${name}.mjs`,
  prerequisite:
    "https://github.com/qmu/plgg/pull/195",
});

test("runs all gates, forces opt-in, suppresses child secrets and indexes failures", () => {
  fixture((root) => {
    writeFileSync(
      join(root, "pass.mjs"),
      'process.exit(process.env.INDEX_GATE_OPT_IN === "1" ? 0 : 1);',
    );
    writeFileSync(
      join(root, "fail.mjs"),
      'console.error("secret-must-not-escape"); process.exit(7);',
    );
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [gate("fail"), gate("pass")],
    );
    assert.deepEqual(
      index.packages.map((entry) => [
        entry.package,
        entry.status,
        entry.reason,
      ]),
      [
        [
          "fail",
          "failed",
          "consumer-gate-failed",
        ],
        ["pass", "passed", "passed"],
      ],
    );
    assert.equal(
      index.packages[0]?.reproduction,
      "npx --yes --package=node@24 -c 'node fail.mjs'",
    );
    assert.equal(
      JSON.stringify(index).includes(
        "secret-must-not-escape",
      ),
      false,
    );
  });
});

test("missing gates and wrong Node are blocked, never passed or executed", () => {
  fixture((root) => {
    const execute = (): never => {
      throw new Error("must not execute");
    };
    assert.equal(
      collectPublicGateIndex(
        root,
        "24.0.0",
        [gate("missing")],
        execute,
      ).packages[0]?.reason,
      "gate-unavailable",
    );
    writeFileSync(join(root, "present.mjs"), "");
    const index = collectPublicGateIndex(
      root,
      "22.0.0",
      [gate("present")],
      execute,
    );
    assert.equal(
      index.packages[0]?.reason,
      "node-24-required",
    );
    assert.equal(
      index.packages[0]?.status,
      "blocked",
    );
  });
});

test("spawn errors and timeouts have fixed safe reasons and do not stop later gates", () => {
  fixture((root) => {
    writeFileSync(join(root, "present.mjs"), "");
    for (const outcome of [
      { status: null },
      {
        status: null,
        error: new Error("secret"),
      },
    ]) {
      const index = collectPublicGateIndex(
        root,
        "24.0.0",
        [gate("present"), gate("present")],
        () => outcome,
      );
      assert.equal(index.packages.length, 2);
      assert.equal(
        index.packages[0]?.reason,
        "gate-execution-failed",
      );
      assert.equal(
        index.packages[0]?.status,
        "blocked",
      );
      assert.equal(
        JSON.stringify(index).includes("secret"),
        false,
      );
    }
  });
});

test("complete snapshot replaces stale failure entries atomically", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    const failed = collectPublicGateIndex(
      root,
      "24.0.0",
      [gate("missing")],
    );
    writePublicGateIndex(output, failed);
    const green = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    writePublicGateIndex(output, green);
    assert.deepEqual(
      JSON.parse(readFileSync(output, "utf8")),
      green,
    );
    assert.deepEqual(readdirSync(root), [
      "index.json",
    ]);
  });
});

test("write failure preserves previous index and removes temporary file", () => {
  fixture((root) => {
    // A directory cannot be atomically replaced by the index file.
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    assert.throws(() =>
      writePublicGateIndex(root, index),
    );
    assert.deepEqual(readdirSync(root), []);
  });
});

test("CLI writes a complete index and exits nonzero when prerequisites are absent", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    mkdirSync(join(root, "scripts"));
    for (const name of [
      "runPublicGateIndex.ts",
      "publicGateIndex.ts",
    ]) {
      copyFileSync(
        fileURLToPath(
          new URL(name, import.meta.url),
        ),
        join(root, "scripts", name),
      );
    }
    const cli = join(
      root,
      "scripts",
      "runPublicGateIndex.ts",
    );
    const result = spawnSync(
      process.execPath,
      [cli, output],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    const contents = readFileSync(output, "utf8");
    assert.match(
      contents,
      /"package": "plgg-test"/,
    );
    assert.match(
      contents,
      /"package": "plgg-md"/,
    );
    assert.match(contents, /"package": "plgg"/);
    assert.equal(
      contents.includes('"status": "passed"'),
      false,
    );
    assert.match(
      result.stdout,
      /plgg-test: blocked/,
    );
  });
});
