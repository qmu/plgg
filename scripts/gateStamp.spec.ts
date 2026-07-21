import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  treeDigest,
  stampMatches,
  writeStamp,
  readStamp,
  shortDigest,
  stampPath,
} from "./gateStamp.ts";

/**
 * Build a throwaway git repo with one commit and return its root. The
 * caller removes it. A real repo is required because the digest is a git
 * tree object, not a hash we could fake.
 */
const makeRepo = (): string => {
  const root = mkdtempSync(
    join(tmpdir(), "gate-stamp-"),
  );
  const g = (args: ReadonlyArray<string>): void => {
    execFileSync("git", [...args], { cwd: root });
  };
  g(["init", "-q"]);
  g(["config", "user.email", "t@example.com"]);
  g(["config", "user.name", "Test"]);
  writeFileSync(join(root, "a.txt"), "one\n");
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "init"]);
  return root;
};

test("treeDigest is stable across calls on a clean tree", () => {
  const root = makeRepo();
  try {
    assert.equal(treeDigest(root), treeDigest(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a tracked edit changes the digest", () => {
  const root = makeRepo();
  try {
    const before = treeDigest(root);
    writeFileSync(join(root, "a.txt"), "two\n");
    assert.notEqual(before, treeDigest(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stamp matches after write, breaks after a tracked edit", () => {
  const root = makeRepo();
  try {
    assert.equal(readStamp(root), null);
    assert.equal(stampMatches(root), false);
    writeStamp(root);
    // Writing the git-ignored stamp must not move the digest.
    assert.equal(stampMatches(root), true);
    writeFileSync(join(root, "a.txt"), "edited\n");
    assert.equal(stampMatches(root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the stamp file's presence does not change the digest", () => {
  const root = makeRepo();
  try {
    const before = treeDigest(root);
    writeFileSync(stampPath(root), "junk\n");
    assert.equal(before, treeDigest(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shortDigest abbreviates both halves", () => {
  assert.equal(
    shortDigest(
      "0123456789abcdef-fedcba9876543210",
    ),
    "012345678-fedcba987",
  );
});
