import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { smokeBundle } from "./smokeBundle.ts";

const scratch = (t) => {
  const root = mkdtempSync(
    join(tmpdir(), "plgg-publish-smoke-"),
  );
  t.after(() =>
    rmSync(root, {
      recursive: true,
      force: true,
    }),
  );
  // Match publish.ts: the consumer has a private staging parent.
  // Workspace discovery scans siblings; /tmp itself is not our fixture.
  const consumer = join(root, "consumer");
  mkdirSync(consumer);
  return consumer;
};

test("release smoke builds and executes an npm-installed tarball twice", (t) => {
  const consumer = scratch(t);
  const packed = execFileSync(
    "npm",
    [
      "pack",
      "--silent",
      "--pack-destination",
      consumer,
    ],
    {
      cwd: resolve("packages/plgg-bundle"),
      encoding: "utf8",
    },
  ).trim();
  writeFileSync(
    join(consumer, "package.json"),
    '{"private":true}',
  );
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(consumer, packed),
    ],
    {
      cwd: consumer,
      stdio: "pipe",
      timeout: 120_000,
      env: {
        ...process.env,
        npm_config_min_release_age: "0",
      },
    },
  );
  assert.equal(
    lstatSync(
      join(
        consumer,
        "node_modules",
        "plgg-bundle",
      ),
    ).isSymbolicLink(),
    false,
  );
  assert.equal(
    smokeBundle(consumer),
    "two app builds + execution ok",
  );
});

for (const failure of [
  "second start",
  "stale output",
]) {
  test(`release smoke rejects ${failure}`, (t) => {
    const consumer = scratch(t);
    const bin = join(
      consumer,
      "node_modules",
      "plgg-bundle",
      "bin",
    );
    mkdirSync(bin, { recursive: true });
    writeFileSync(
      join(bin, "plgg-bundle.mjs"),
      `
      import { existsSync, mkdirSync, writeFileSync } from "node:fs";
      const second = existsSync("started");
      if (second && ${JSON.stringify(failure)} === "second start") {
        throw new Error("ERR_FS_EISDIR: second start failed");
      }
      writeFileSync("started", "yes");
      mkdirSync("dist", { recursive: true });
      writeFileSync("dist/main.js", "console.log(1)");
    `,
    );
    assert.throws(
      () => smokeBundle(consumer),
      failure === "second start"
        ? /ERR_FS_EISDIR/
        : /updated input/,
    );
  });
}
