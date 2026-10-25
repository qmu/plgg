import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collect,
  buildSnapshot,
  saveSnapshot,
} from "./collectIssue157.mjs";
const pull = {
  number: 166,
  merged: true,
  merge_commit_sha: "a".repeat(40),
  merged_at: "2026-10-25T11:34:03Z",
  base: {
    ref: "main",
    repo: { full_name: "qmu/plgg" },
  },
};
const snapshot = (
  version,
  lazy = true,
  pr = pull,
) =>
  buildSnapshot(
    pr,
    { version },
    { lazy, application: true },
    "2026-10-25T14:00:00Z",
  );
test("old npm release remains blocked even with merged implementation", () => {
  const result = snapshot("0.0.2", false);
  assert.equal(
    result.implementation.merged,
    true,
  );
  assert.equal(result.canClose, false);
  assert.equal(
    result.conditions.find(
      (c) => c.id === "published-version",
    ).status,
    "blocked",
  );
});
test("new version and exports cannot substitute for behavioral consumer evidence", () => {
  const result = snapshot("0.0.3");
  assert.equal(result.canClose, false);
  assert.equal(
    result.conditions.filter(
      (c) => c.status === "pending",
    ).length,
    3,
  );
});
for (const pr of [
  { ...pull, number: 167 },
  { ...pull, merged: false },
  { ...pull, merge_commit_sha: "invalid" },
  { ...pull, base: { ref: "other" } },
]) {
  test(`reject unrelated or incomplete merge ${JSON.stringify(pr)}`, () =>
    assert.equal(
      snapshot("0.0.3", true, pr).implementation
        .merged,
      false,
    ));
}
test("failed rename preserves the entire prior snapshot and cleans temporary data", () => {
  const dir = mkdtempSync(
    join(tmpdir(), "issue157-test-"),
  );
  const path = join(dir, "ledger.json");
  try {
    saveSnapshot(path, snapshot("0.0.2"));
    const before = readFileSync(path, "utf8");
    assert.throws(() =>
      saveSnapshot(
        path,
        snapshot("0.0.3"),
        () => {
          throw Error("disk");
        },
      ),
    );
    assert.equal(
      readFileSync(path, "utf8"),
      before,
    );
    assert.deepEqual(readdirSync(dir), [
      "ledger.json",
    ]);
    saveSnapshot(path, snapshot("0.0.3"));
    assert.equal(
      JSON.parse(readFileSync(path, "utf8"))
        .acquisition.version,
      "0.0.3",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const version of [
  "0.0.3",
  "0.0.10",
  "0.1.0",
  "1.0.0",
]) {
  test(`accept stable minimum version ${version}`, () =>
    assert.equal(
      snapshot(version).conditions.find(
        (c) => c.id === "published-version",
      ).status,
      "passed",
    ));
}
for (const version of [
  "0.0.2",
  "0.0.3-beta.1",
  "00.0.3",
  "junk",
]) {
  test(`reject insufficient or nonstable version ${version}`, () =>
    assert.equal(
      snapshot(version).conditions.find(
        (c) => c.id === "published-version",
      ).status,
      "blocked",
    ));
}

for (const failure of [
  "none",
  "integrity",
  "latest",
  "import",
]) {
  test(`collector binds actual bytes, imports and latest: ${failure}`, () => {
    const dir = mkdtempSync(
      join(tmpdir(), "issue157-collect-"),
    );
    const output = join(dir, "ledger.json");
    const bytes = Buffer.from(
      "fixture tarball bytes",
    );
    const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    const shasum = createHash("sha1")
      .update(bytes)
      .digest("hex");
    saveSnapshot(output, snapshot("0.0.1"));
    const before = readFileSync(output, "utf8");
    const execute = (command, args, cwd) => {
      if (command === "gh")
        return JSON.stringify(pull);
      if (
        args[0] === "view" &&
        args.includes("dist")
      )
        return JSON.stringify({
          version: "0.0.2",
          dist: {
            integrity,
            shasum,
            tarball:
              "https://registry.npmjs.org/plgg-view/-/plgg-view-0.0.2.tgz",
          },
        });
      if (args[0] === "pack") {
        writeFileSync(
          join(cwd, "plgg-view-0.0.2.tgz"),
          failure === "integrity"
            ? "corrupt"
            : bytes,
        );
        return JSON.stringify([
          {
            name: "plgg-view",
            version: "0.0.2",
            integrity,
            shasum,
            filename: "plgg-view-0.0.2.tgz",
          },
        ]);
      }
      if (args[0] === "install") return "";
      if (args[0] === "view")
        return JSON.stringify(
          failure === "latest"
            ? "0.0.3"
            : "0.0.2",
        );
      if (failure === "import")
        throw Error("missing entrypoint");
      return JSON.stringify({
        lazy: false,
        application: true,
      });
    };
    try {
      if (failure === "none") {
        collect(output, execute);
        const result = JSON.parse(
          readFileSync(output, "utf8"),
        );
        assert.equal(
          result.acquisition.integrity,
          integrity,
        );
        assert.equal(
          result.acquisition.version,
          "0.0.2",
        );
        assert.equal(result.canClose, false);
      } else {
        assert.throws(() =>
          collect(output, execute),
        );
        assert.equal(
          readFileSync(output, "utf8"),
          before,
        );
      }
    } finally {
      rmSync(dir, {
        recursive: true,
        force: true,
      });
    }
  });
}
