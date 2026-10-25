import { strict as assert } from "node:assert";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
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
  publicPackageReproductionCommand,
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
  "lifecycle",
  "prepare",
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
      const hook = `node -e "require('node:fs').writeFileSync('${join(root, "hook-ran")}', 'unsafe'); process.exit(7)"`;
      writeFileSync(
        join(pkg, "package.json"),
        JSON.stringify({
          name: "fixture",
          version: "1.2.3",
          scripts: {
            prepack: hook,
            ...(mode === "prepare"
              ? {
                  prepare: hook,
                }
              : {}),
            postpack: hook,
          },
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
      if (
        mode === "lifecycle" ||
        mode === "prepare"
      ) {
        rmSync(join(bin, "npm"));
      }
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
        mode === "success" || mode === "lifecycle"
          ? 0
          : 1,
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
      assert.ok(
        !existsSync(join(root, "hook-ran")),
      );
      if (
        mode === "success" ||
        mode === "lifecycle"
      ) {
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
          mode === "pack" || mode === "prepare"
            ? /phase: pack/
            : /phase: stage/,
        );
        const reasons = new Map([
          [
            "prepare",
            /reason: package.json declares a prepare hook/,
          ],
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
        assert.equal(
          result.stderr
            .trimEnd()
            .split("\n")
            .at(-1),
          `reproduce (from repository root; no publish): ${publicPackageReproductionCommand("fixture")}`,
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

test("reproduction command round-trips shell metacharacters without execution", () => {
  const root = mkdtempSync(
    join(tmpdir(), "public-gate-shell-"),
  );
  try {
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(
      join(bin, "node"),
      '#!/bin/sh\nprintf "%s\\n" "$@" > argv.txt\n',
      { mode: 0o755 },
    );
    const dir =
      "example'$(touch injected);`touch injected`&package";
    const command =
      publicPackageReproductionCommand(dir);
    const result = spawnSync(
      "/bin/sh",
      ["-c", command],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env["PATH"] ?? ""}`,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      readFileSync(join(root, "argv.txt"), "utf8")
        .trimEnd()
        .split("\n"),
      [
        "scripts/publish.ts",
        "--dry-run",
        "--only",
        dir,
      ],
    );
    assert.ok(
      !existsSync(join(root, "injected")),
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
