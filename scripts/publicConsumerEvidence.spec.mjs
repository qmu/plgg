import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  evidenceSources,
  packageEvidence,
  scriptVersion,
  writeEvidence,
} from "./publicConsumerEvidence.mjs";

const fixture = (run) => {
  const root = mkdtempSync(
    join(tmpdir(), "consumer-evidence-"),
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

test("tarball evidence hashes actual bytes and excludes manifest secrets and paths", () =>
  fixture((root) => {
    const tarball = join(root, "package.tgz");
    writeFileSync(tarball, "abc");
    const pkg = {
      name: "fixture",
      version: "1.2.3",
      token: "do-not-copy",
    };
    const first = packageEvidence(pkg, tarball);
    assert.deepEqual(first, {
      name: "fixture",
      version: "1.2.3",
      tarballSha256:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    });
    writeFileSync(tarball, "changed");
    assert.notEqual(
      packageEvidence(pkg, tarball).tarballSha256,
      first.tarballSha256,
    );
    assert.throws(
      () =>
        packageEvidence(
          pkg,
          join(root, "missing"),
        ),
      /ENOENT/,
    );
  }));

test("script version is stable and changes for every gate source edit", () =>
  fixture((root) => {
    for (const path of evidenceSources) {
      mkdirSync(dirname(join(root, path)), {
        recursive: true,
      });
      writeFileSync(join(root, path), path);
    }
    const before = scriptVersion(root);
    assert.deepEqual(scriptVersion(root), before);
    for (const path of evidenceSources) {
      writeFileSync(join(root, path), "edited");
      assert.notEqual(
        scriptVersion(root).sha256,
        before.sha256,
      );
      writeFileSync(join(root, path), path);
    }
    const output = join(
      root,
      "output/result.json",
    );
    writeEvidence(root, output, {
      nodeVersion: "24.22.1",
      typescriptVersion: "7.0.2",
      secret: "do-not-copy",
      packages: [
        {
          name: "fixture",
          version: "1.2.3",
          tarballSha256: "digest",
          path: root,
        },
      ],
    });
    const saved = JSON.parse(
      readFileSync(output, "utf8"),
    );
    assert.deepEqual(saved, {
      schemaVersion: 1,
      status: "passed",
      nodeVersion: "24.22.1",
      typescriptVersion: "7.0.2",
      scriptVersion: before,
      packages: [
        {
          name: "fixture",
          version: "1.2.3",
          tarballSha256: "digest",
        },
      ],
    });
  }));

test("a failed prerequisite removes an old successful artifact before building", () =>
  fixture((root) => {
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, ".artifacts"));
    mkdirSync(join(root, "bin"));
    const output = join(
      root,
      ".artifacts/public-consumer.json",
    );
    writeFileSync(output, '{"status":"passed"}');
    copyFileSync(
      new URL(
        "./gate-public-consumer.sh",
        import.meta.url,
      ),
      join(
        root,
        "scripts/gate-public-consumer.sh",
      ),
    );
    const node = join(root, "bin/node");
    writeFileSync(node, "#!/bin/sh\nexit 1\n");
    chmodSync(node, 0o755);
    const result = spawnSync(
      "/bin/sh",
      [
        join(
          root,
          "scripts/gate-public-consumer.sh",
        ),
      ],
      {
        env: {
          PATH: `${join(root, "bin")}:/usr/bin:/bin`,
        },
      },
    );
    assert.equal(result.status, 1);
    assert.equal(existsSync(output), false);
  }));
