/** Real npm install, outside the workspace; no copied node_modules or links. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  stageEntries,
  stagedManifest,
} from "./stagePackage.ts";

const scripts = dirname(
  fileURLToPath(import.meta.url),
);
const source = resolve(
  scripts,
  "../packages/plgg-bundle",
);
const scratch = mkdtempSync(
  join(tmpdir(), "bundle-ts7-"),
);
const stage = join(scratch, "stage");
const consumer = join(scratch, "consumer");
const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const readManifest = (
  path: string,
): Record<string, unknown> => {
  const value: unknown = JSON.parse(
    readFileSync(path, "utf8"),
  );
  if (!isRecord(value)) {
    throw new Error("Invalid package manifest");
  }
  return value;
};
const run = (
  command: string,
  args: string[],
  cwd: string,
): string =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

try {
  // Build exactly the artifact the publisher stages, rather than pack source.
  run("npm", ["run", "build"], source);
  mkdirSync(stage);
  const manifest = readManifest(
    join(source, "package.json"),
  );
  for (const entry of stageEntries(manifest)) {
    // The conventional LICENSE is optional, just like publish.ts staging.
    if (!existsSync(join(source, entry)))
      continue;
    cpSync(
      join(source, entry),
      join(stage, entry),
      { recursive: true },
    );
  }
  writeFileSync(
    join(stage, "package.json"),
    stagedManifest(manifest, (spec) => {
      const version = readManifest(
        resolve(
          source,
          spec.slice(5),
          "package.json",
        ),
      )["version"];
      if (typeof version !== "string")
        throw new Error(
          "Missing dependency version",
        );
      return version;
    }),
  );
  const tarball = run(
    "npm",
    [
      "pack",
      "--ignore-scripts",
      "--loglevel=error",
      "--pack-destination",
      scratch,
    ],
    stage,
  ).trim();
  cpSync(
    join(scripts, "fixtures/bundle-ts7"),
    consumer,
    { recursive: true },
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-dev",
      join(scratch, tarball),
    ],
    consumer,
  );
  const consumerRequire = createRequire(
    join(consumer, "package.json"),
  );
  const bundleRoot = join(
    consumer,
    "node_modules/plgg-bundle",
  );
  assert.equal(
    realpathSync(bundleRoot),
    realpathSync(join(consumer, "node_modules")) +
      "/plgg-bundle",
  );
  const bundleRequire = createRequire(
    join(bundleRoot, "dist/cli.es.js"),
  );
  const consumerTs = consumerRequire.resolve(
    "typescript/package.json",
  );
  const bundleTs = bundleRequire.resolve(
    "typescript/package.json",
  );
  assert.equal(
    readManifest(consumerTs)["version"],
    "7.0.2",
  );
  assert.match(
    String(readManifest(bundleTs)["version"]),
    /^6\./,
  );
  assert.notEqual(consumerTs, bundleTs);
  console.log(
    "PASS consumer resolves TypeScript 7.0.2; packed CLI resolves nested TypeScript 6",
  );
  const bin = join(
    consumer,
    "node_modules/.bin/plgg-bundle",
  );
  run(process.execPath, [bin], consumer);
  console.log(
    "PASS packed CLI transpiles typed multi-file app",
  );
  assert.equal(
    run(
      process.execPath,
      ["dist/main.es.js"],
      consumer,
    ).trim(),
    "packed bundle runtime: 42",
  );
  console.log(
    "PASS emitted JavaScript executes: 42",
  );
  const tsc = join(
    dirname(consumerTs),
    "bin/tsc",
  );
  run(
    process.execPath,
    [tsc, "--noEmit", "-p", "tsconfig.json"],
    consumer,
  );
  console.log(
    "PASS consumer TypeScript 7 typecheck",
  );
  // A negative control proves the compiler actually checks the fixture.
  writeFileSync(
    join(consumer, "src/invalid.ts"),
    'const invalid: number = "wrong";\n',
  );
  assert.throws(
    () =>
      run(
        process.execPath,
        [tsc, "--noEmit", "-p", "tsconfig.json"],
        consumer,
      ),
    (error: unknown) =>
      isRecord(error) &&
      error["status"] === 1 &&
      typeof error["stdout"] === "string" &&
      error["stdout"].includes("TS2322"),
  );
  console.log(
    "PASS typecheck rejects deliberate TS2322",
  );
} finally {
  rmSync(scratch, {
    recursive: true,
    force: true,
  });
}
