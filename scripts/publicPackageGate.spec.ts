import { strict as assert } from "node:assert";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkPublicPackage,
  PublicPackageFailure,
} from "./publicPackageGate.ts";

const context = {
  name: "example",
  version: "1.2.3",
  dir: "example's-package",
  phase: "stage",
} satisfies Parameters<
  typeof checkPublicPackage
>[0];

test("shared gate preserves successful values", () => {
  assert.equal(
    checkPublicPackage(context, () => 42),
    42,
  );
});

test("unexpected failures expose only a safe status, never raw output", () => {
  for (const [failure, expected] of [
    [null, "stage operation failed;"],
    ["private-output", "stage operation failed;"],
    [
      {
        code: "ENOENT",
        stderr: "private-output",
      },
      "stage operation failed (ENOENT);",
    ],
    [
      { code: "private-output" },
      "stage operation failed;",
    ],
  ]) {
    assert.throws(
      () =>
        checkPublicPackage(context, () => {
          throw failure;
        }),
      (error: unknown) => {
        assert.ok(
          error instanceof PublicPackageFailure,
        );
        assert.ok(
          error.message.includes(
            String(expected),
          ),
        );
        assert.ok(
          !error.message.includes(
            "private-output",
          ),
        );
        return true;
      },
    );
  }
});

test("shared gate quotes reproduction arguments and retains authored reasons", () => {
  assert.throws(
    () =>
      checkPublicPackage(context, () => {
        throw new PublicPackageFailure(
          "missing dist/index.js",
        );
      }),
    (error: unknown) => {
      assert.ok(
        error instanceof PublicPackageFailure,
      );
      assert.match(
        error.message,
        /reason: missing dist\/index.js/,
      );
      assert.ok(
        error.message.endsWith(
          "--only 'example'\\''s-package'",
        ),
      );
      assert.ok(
        !error.message.includes("--publish"),
      );
      return true;
    },
  );
});

for (const mode of [
  "allowlist",
  "entry",
  "pack",
  "success",
]) {
  test(`publisher CLI: ${mode} diagnostics and cleanup`, () => {
    const root = mkdtempSync(
      join(tmpdir(), "public-gate-test-"),
    );
    try {
      const scripts = join(root, "scripts");
      const pkg = join(
        root,
        "packages",
        "fixture",
      );
      const bin = join(root, "bin");
      for (const dir of [scripts, pkg, bin])
        mkdirSync(dir, { recursive: true });
      for (const file of [
        "publish.ts",
        "publishSet.ts",
        "stagePackage.ts",
        "publicPackageGate.ts",
      ]) {
        copyFileSync(
          new URL(file, import.meta.url),
          join(scripts, file),
        );
      }
      writeFileSync(
        join(scripts, "build.sh"),
        "cd $REPO_ROOT/packages/fixture && npm run build\n",
      );
      writeFileSync(
        join(pkg, "package.json"),
        JSON.stringify({
          name: "fixture",
          version: "1.2.3",
          ...(mode === "allowlist"
            ? {}
            : { files: ["dist"] }),
          ...(mode === "entry"
            ? { main: "dist/missing.js" }
            : {}),
        }),
      );
      writeFileSync(
        join(bin, "npm"),
        mode === "pack"
          ? "#!/bin/sh\necho secret-sentinel >&2\nexit 9\n"
          : '#!/bin/sh\nprintf \'[{"filename":"fixture.tgz","size":10,"unpackedSize":20}]\\n\'\n',
        { mode: 0o755 },
      );
      const result = spawnSync(
        process.execPath,
        [
          join(scripts, "publish.ts"),
          "--dry-run",
          "--only",
          "fixture",
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${bin}:${process.env["PATH"] ?? ""}`,
          },
        },
      );
      assert.equal(
        result.status,
        mode === "success" ? 0 : 1,
        result.stderr,
      );
      assert.ok(
        !result.stderr.includes(
          "secret-sentinel",
        ),
      );
      assert.ok(
        !readdirSync(root).some((name) =>
          name.startsWith(".publish-stage."),
        ),
      );
      if (mode === "success") {
        assert.match(
          result.stdout,
          /dry-run: 1 package/,
        );
      } else {
        assert.match(
          result.stderr,
          /public-package gate FAILED: fixture@1.2.3/,
        );
        assert.match(
          result.stderr,
          mode === "pack"
            ? /phase: pack/
            : /phase: stage/,
        );
        const reasons = new Map([
          [
            "allowlist",
            /reason: .*no "files" allowlist/,
          ],
          [
            "entry",
            /reason: .*missing declared entry point/,
          ],
          [
            "pack",
            /reason: pack operation failed \(exit 9\)/,
          ],
        ]);
        assert.match(
          result.stderr,
          reasons.get(mode) ?? /never/,
        );
        assert.match(
          result.stderr,
          /node scripts\/publish.ts --dry-run --only 'fixture'/,
        );
      }
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
}
