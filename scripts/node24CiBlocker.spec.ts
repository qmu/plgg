import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blockerArtifact, writeBlockerArtifact } from "./node24CiBlocker.ts";

test("fixed blocker distinguishes credential permissions from runtime permissions", () => {
  const artifact = blockerArtifact();
  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.reasonCode, "workflow-write-permission-required");
  assert.equal(artifact.livePermissionCheck, false);
  assert.equal(artifact.evidenceKind, "recorded-issue-blocker");
  assert.deepEqual(artifact.runtimePermissions, ["contents: read"]);
  assert.equal(artifact.requiredPermissions.length, 3);
  assert.ok(
    artifact.requiredPermissions[0]?.permissions.includes("Workflows: write"),
  );
  assert.ok(artifact.requiredPermissions[2]?.permissions.includes("workflow"));
});

test("CLI writes a blocked artifact and exits nonzero without persisting injected secrets", () => {
  const root = mkdtempSync(join(tmpdir(), "ci-blocker-"));
  try {
    mkdirSync(join(root, "scripts"));
    copyFileSync(
      new URL("./node24CiBlocker.ts", import.meta.url),
      join(root, "scripts", "node24CiBlocker.ts"),
    );
    const child = spawnSync(
      process.execPath,
      [join(root, "scripts", "node24CiBlocker.ts")],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_TOKEN: "synthetic-secret-never-persist",
          CORPD_TASK_TOKEN: "synthetic-task-secret",
        },
      },
    );
    assert.equal(child.status, 1);
    assert.match(child.stdout, /BLOCKED workflow-write-permission-required/);
    const content = readFileSync(
      join(root, ".artifacts", "node24-ci-blocker.json"),
      "utf8",
    );
    assert.deepEqual(JSON.parse(content), blockerArtifact());
    assert.doesNotMatch(
      content + child.stdout + child.stderr,
      /synthetic-secret|synthetic-task/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("writer replaces stale evidence and removes temporary files on failure", () => {
  const root = mkdtempSync(join(tmpdir(), "ci-blocker-write-"));
  try {
    const path = join(root, "artifact.json");
    writeFileSync(path, '{"status":"passed"}');
    writeBlockerArtifact(path);
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), blockerArtifact());
    assert.equal(statSync(path).mode & 0o777, 0o600);
    const directory = join(root, "directory");
    mkdirSync(directory);
    assert.throws(() => writeBlockerArtifact(directory));
    assert.deepEqual(readdirSync(root).sort(), ["artifact.json", "directory"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
