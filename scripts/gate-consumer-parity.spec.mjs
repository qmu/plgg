import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  assess,
  runParity,
} from "./gate-consumer-parity.mjs";

const revision = "a".repeat(40);
function fixture() {
  const versions = {
    "plgg-bundle": "0.0.7",
    "plgg-view": "0.0.3",
    plgg: "0.0.27",
  };
  const packages = Object.entries(versions).map(
    ([name, version]) => ({
      name,
      version,
      sha256: "b".repeat(64),
    }),
  );
  return {
    versions,
    candidate: {
      revision,
      trackedDiffSha256: createHash("sha256")
        .update("")
        .digest("hex"),
      status: "passed",
      packages: structuredClone(packages),
      steps: [
        "TypeScript 7 declarations",
        "npm app build 1",
        "npm app build 2",
        "packed DOM acceptance #157 #158",
      ].map((name) => ({ name, status: 0 })),
    },
    published: {
      complete: true,
      packages,
      checks: [
        "bundle-restart",
        "consumer-ts7",
        "svg-elements",
        "raw-identity",
        "frame-dispatch",
        "lazy-subtree",
      ].map((id) => ({ id, status: "passed" })),
    },
  };
}
function inspect(f) {
  return assess(
    revision,
    f.versions,
    f.candidate,
    f.published,
  );
}
test("matching revision, versions, bytes and both complete consumers pass", () =>
  assert.deepEqual(inspect(fixture()), []));
for (const [name, mutate, reason] of [
  [
    "revision",
    (f) =>
      (f.candidate.revision = "c".repeat(40)),
    "integration-revision-mismatch",
  ],
  [
    "dirty tree",
    (f) =>
      (f.candidate.trackedDiffSha256 = "c".repeat(
        64,
      )),
    "integration-tree-dirty",
  ],
  [
    "candidate failure",
    (f) => f.candidate.steps.pop(),
    "candidate-consumer-failed",
  ],
  [
    "registry false green",
    (f) => f.published.checks.pop(),
    "published-consumer-failed",
  ],
  [
    "duplicate check",
    (f) =>
      (f.published.checks[0] =
        f.published.checks[1]),
    "published-consumer-failed",
  ],
  [
    "registry failure",
    (f) => (f.published.complete = false),
    "published-consumer-failed",
  ],
  [
    "missing artifact",
    (f) => f.published.packages.shift(),
    "artifact-missing-or-duplicate:plgg-bundle",
  ],
  [
    "duplicate artifact",
    (f) =>
      f.candidate.packages.push(
        f.candidate.packages[0],
      ),
    "artifact-missing-or-duplicate:plgg-bundle",
  ],
  [
    "old version",
    (f) =>
      (f.published.packages[0].version = "0.0.6"),
    "version-mismatch:plgg-bundle",
  ],
  [
    "different bytes",
    (f) =>
      (f.published.packages[0].sha256 =
        "c".repeat(64)),
    "tarball-mismatch:plgg-bundle",
  ],
  [
    "absent hashes",
    (f) => {
      delete f.published.packages[0].sha256;
      delete f.candidate.packages[0].sha256;
    },
    "tarball-mismatch:plgg-bundle",
  ],
])
  test(name, () => {
    const f = fixture();
    mutate(f);
    assert.ok(inspect(f).includes(reason));
  });
test("missing revision replaces stale green and returns only fixed reasons", async () => {
  const root = mkdtempSync(
    join(tmpdir(), "parity-test-"),
  );
  try {
    mkdirSync(join(root, ".consumer-parity"));
    writeFileSync(
      join(root, ".consumer-parity/result.json"),
      '{"status":"passed"}',
    );
    const result = await runParity(
      root,
      "private diagnostic",
    );
    assert.deepEqual(result.reasons, [
      "integration-revision-required",
    ]);
    assert.equal(
      JSON.parse(
        readFileSync(
          join(
            root,
            ".consumer-parity/result.json",
          ),
        ),
      ).status,
      "failed",
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
test("missing prerequisites fail closed on a clean integration commit", async () => {
  const root = mkdtempSync(
    join(tmpdir(), "parity-test-"),
  );
  const git = (...args) => {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
    return result.stdout.trim();
  };
  try {
    git("init");
    writeFileSync(
      join(root, ".gitignore"),
      ".consumer-parity/\n",
    );
    for (const name of Object.keys(
      fixture().versions,
    )) {
      mkdirSync(join(root, "packages", name), {
        recursive: true,
      });
      writeFileSync(
        join(
          root,
          "packages",
          name,
          "package.json",
        ),
        '{"version":"1.0.0"}',
      );
    }
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-m",
      "fixture",
    );
    const result = await runParity(
      root,
      git("rev-parse", "HEAD"),
    );
    assert.deepEqual(result.reasons, [
      "prerequisite-gates-unavailable",
    ]);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
for (const mode of [
  "matching",
  "tampered",
  "throwing",
])
  test(`coordinator probes: ${mode}`, async () => {
    const root = mkdtempSync(
      join(tmpdir(), "parity-probes-"),
    );
    const git = (...args) => {
      const result = spawnSync("git", args, {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(result.status, 0);
      return result.stdout.trim();
    };
    try {
      git("init");
      mkdirSync(join(root, "scripts"));
      writeFileSync(
        join(root, ".gitignore"),
        ".consumer-parity/\n.corpd-consumer/\n",
      );
      const f = fixture();
      const digest = createHash("sha256")
        .update("packed bytes")
        .digest("hex");
      for (const name of Object.keys(
        f.versions,
      )) {
        mkdirSync(join(root, "packages", name), {
          recursive: true,
        });
        writeFileSync(
          join(
            root,
            "packages",
            name,
            "package.json",
          ),
          JSON.stringify({
            version: f.versions[name],
          }),
        );
      }
      for (const pkg of f.candidate.packages) {
        pkg.sha256 = digest;
        pkg.filename = `${pkg.name}.tgz`;
      }
      for (const pkg of f.published.packages)
        pkg.sha256 = digest;
      writeFileSync(
        join(
          root,
          "scripts/gate-corpd-consumer.mjs",
        ),
        `
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
export function runGate(root, output) {
  ${mode === "throwing" ? 'throw Error("private diagnostic must not escape");' : ""}
  const result = ${JSON.stringify(f.candidate)};
  result.revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  mkdirSync(join(output, 'tarballs'), { recursive: true });
  for (const pkg of result.packages) writeFileSync(join(output, 'tarballs', pkg.filename), ${JSON.stringify(mode === "tampered" ? "wrong bytes" : "packed bytes")});
  return result;
}`,
      );
      writeFileSync(
        join(
          root,
          "scripts/publishedCompletion.mjs",
        ),
        `
import { writeFileSync } from 'node:fs';
export async function generate(output) {
  const result = ${JSON.stringify(f.published)};
  writeFileSync(output, JSON.stringify(result));
  return result;
}`,
      );
      git("add", ".");
      git(
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.invalid",
        "commit",
        "-m",
        "fixture",
      );
      const result = await runParity(
        root,
        git("rev-parse", "HEAD"),
      );
      if (mode === "matching")
        assert.equal(result.status, "passed");
      else
        assert.deepEqual(result.reasons, [
          mode === "tampered"
            ? "candidate-artifact-invalid"
            : "consumer-probe-unavailable",
        ]);
      assert.ok(
        readFileSync(
          join(
            root,
            ".consumer-parity/published.json",
          ),
          "utf8",
        ).includes('"complete":true'),
      );
      assert.ok(
        !JSON.stringify(result).includes(
          "private diagnostic",
        ),
      );
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
