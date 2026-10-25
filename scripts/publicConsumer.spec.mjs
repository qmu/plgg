import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gate,
  checkRuntime,
  publicSpecifiers,
} from "./publicConsumer.mjs";

test("requires Node 24 and consumer TS7 without a skip path", () => {
  checkRuntime("24.22.1", "^7.0.2");
  assert.throws(() =>
    checkRuntime("22.23.4", "^7.0.2"),
  );
  assert.throws(() =>
    checkRuntime("24.22.1", "^6.0.3"),
  );
});
test("covers root condition maps and explicit public subpaths", () => {
  assert.deepEqual(
    publicSpecifiers({
      name: "fixture",
      exports: {
        import: "./index.js",
        require: "./index.cjs",
      },
    }),
    ["fixture"],
  );
  assert.deepEqual(
    publicSpecifiers({
      name: "fixture",
      exports: {
        ".": "./index.js",
        "./framework": {
          import: "./framework.js",
        },
        "./blocked": null,
      },
    }),
    ["fixture", "fixture/framework"],
  );
  assert.throws(() =>
    publicSpecifiers({
      name: "fixture",
      exports: { "./*": "./dist/*.js" },
    }),
  );
});

test("CLI-only packages have no invented root import", () => {
  assert.deepEqual(
    publicSpecifiers({
      name: "cli",
      bin: { cli: "bin/cli.mjs" },
    }),
    [],
  );
});

test("rejects a publish allowlist that drops its declared CLI before packing", () => {
  const root = mkdtempSync(
    join(tmpdir(), "public-consumer-regression-"),
  );
  try {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        devDependencies: { typescript: "^7.0.2" },
      }),
    );
    const pkg = join(root, "packages/fixture");
    mkdirSync(join(pkg, "bin"), {
      recursive: true,
    });
    writeFileSync(
      join(pkg, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        files: ["dist"],
        bin: { fixture: "bin/run.mjs" },
      }),
    );
    writeFileSync(
      join(pkg, "bin/run.mjs"),
      "console.log(42);\n",
    );
    assert.throws(
      () => gate(root),
      /declared entry missing from publish stage/,
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
