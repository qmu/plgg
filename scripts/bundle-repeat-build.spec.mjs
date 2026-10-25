// qmu/plgg#155: exercise the packed npm launcher, not the workspace
// symlink (which deliberately takes the run-from-source branch).
// Relocation was retired in 5b109cec: old caches must remain untouched,
// regardless of the type of their node_modules entry.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(
  new URL("../", import.meta.url),
);
const scratch = mkdtempSync(
  join(tmpdir(), "plgg-repeat-build-"),
);
const consumer = join(scratch, "consumer");
const dependencies = join(
  consumer,
  "node_modules",
);
const installed = join(
  dependencies,
  "plgg-bundle",
);

const run = (command, args, options) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    ...options,
  });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
};

before(() => {
  // Build first: npm pack must contain the current self-bundled CLI.
  const packed = run(
    "npm",
    [
      "pack",
      "--json",
      "--pack-destination",
      scratch,
    ],
    { cwd: join(repo, "packages/plgg-bundle") },
  );
  const [{ filename }] = JSON.parse(packed);
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
    }),
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(scratch, filename),
    ],
    { cwd: consumer },
  );
  assert.equal(
    lstatSync(installed).isSymbolicLink(),
    false,
  );
  mkdirSync(join(consumer, "src"));
  writeFileSync(
    join(consumer, "bundle.config.ts"),
    `export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: { prefix: "repeat-build", srcRoot: "src" },
};\n`,
  );
});

after(() =>
  rmSync(scratch, {
    recursive: true,
    force: true,
  }),
);

for (const kind of [
  "missing",
  "symlink",
  "dangling-symlink",
  "file",
  "directory",
]) {
  test(`two npm app builds preserve legacy cache: ${kind}`, () => {
    const temporary = join(scratch, kind);
    mkdirSync(temporary);
    const { name, version } = JSON.parse(
      readFileSync(
        join(installed, "package.json"),
        "utf8",
      ),
    );
    // Match the retired relocate.mjs cache key exactly, including its ready
    // marker, so a regression to the old launcher reaches the unlink path.
    const tag = createHash("sha1")
      .update(dependencies)
      .digest("hex")
      .slice(0, 12);
    const cache = join(
      temporary,
      `plgg-relocate-${name}-${version}-${tag}`,
    );
    mkdirSync(cache);
    writeFileSync(
      join(cache, ".plgg-relocate-ready"),
      dependencies + "\n",
    );
    const entry = join(cache, "node_modules");
    if (
      kind === "symlink" ||
      kind === "dangling-symlink"
    ) {
      symlinkSync(
        kind === "symlink"
          ? dependencies
          : join(scratch, "absent"),
        entry,
        "dir",
      );
    } else if (kind === "file") {
      writeFileSync(
        entry,
        "keep existing file\n",
      );
    } else if (kind === "directory") {
      mkdirSync(entry);
      writeFileSync(
        join(entry, "sentinel"),
        "keep existing directory\n",
      );
    }
    // lstat deliberately does not follow symlinks, including dangling ones.
    const before = lstatSync(entry, {
      throwIfNoEntry: false,
    });
    const target = before?.isSymbolicLink()
      ? readlinkSync(entry)
      : undefined;
    for (const value of [1, 2]) {
      writeFileSync(
        join(consumer, "src/main.ts"),
        `const value: number = ${value}; console.log(value);\n`,
      );
      rmSync(join(consumer, "dist"), {
        recursive: true,
        force: true,
      });
      run(
        process.execPath,
        [join(installed, "bin/plgg-bundle.mjs")],
        {
          cwd: consumer,
          env: {
            ...process.env,
            TMPDIR: temporary,
            TMP: temporary,
            TEMP: temporary,
          },
        },
      );
      const output = run(
        process.execPath,
        ["dist/main.js"],
        { cwd: consumer },
      );
      assert.equal(output.trim(), String(value));
      const after = lstatSync(entry, {
        throwIfNoEntry: false,
      });
      assert.equal(after?.ino, before?.ino);
      assert.equal(after?.mode, before?.mode);
      if (target !== undefined)
        assert.equal(readlinkSync(entry), target);
      if (kind === "file")
        assert.equal(
          readFileSync(entry, "utf8"),
          "keep existing file\n",
        );
      if (kind === "directory")
        assert.equal(
          readFileSync(
            join(entry, "sentinel"),
            "utf8",
          ),
          "keep existing directory\n",
        );
      assert.deepEqual(readdirSync(temporary), [
        cache.slice(temporary.length + 1),
      ]);
    }
  });
}
