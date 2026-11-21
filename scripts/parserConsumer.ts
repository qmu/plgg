/** Isolated registry + publish-staged tarball consumers. Never use workspace links. */
import assert from "node:assert/strict";
import {
  execFileSync,
  spawnSync,
} from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

assert.equal(
  process.versions.node.split(".")[0],
  "24",
);
const root = dirname(
  dirname(fileURLToPath(import.meta.url)),
);
const scratch = mkdtempSync(
  join(tmpdir(), "plgg-parser-consumer-"),
);
const manifest = (
  directory: string,
): Record<string, unknown> => {
  const value: unknown = JSON.parse(
    readFileSync(
      join(directory, "package.json"),
      "utf8",
    ),
  );
  assert.ok(
    typeof value === "object" &&
      value !== null &&
      !Array.isArray(value),
  );
  return Object.fromEntries(
    Object.entries(value),
  );
};
const version = (directory: string): string => {
  const value = manifest(directory)["version"];
  assert.ok(typeof value === "string");
  return value;
};
const npm = (
  cwd: string,
  args: string[],
): string =>
  execFileSync("npm", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
const pack = (name: string): string => {
  const source = join(root, "packages", name);
  const stage = join(scratch, `${name}-stage`);
  mkdirSync(stage);
  const pkg = manifest(source);
  for (const entry of stageEntries(pkg)) {
    if (existsSync(join(source, entry)))
      cpSync(
        join(source, entry),
        join(stage, entry),
        { recursive: true },
      );
  }
  writeFileSync(
    join(stage, "package.json"),
    stagedManifest(pkg, (spec) =>
      version(resolve(source, spec.slice(5))),
    ),
  );
  npm(stage, [
    "pack",
    "--ignore-scripts",
    "--silent",
  ]);
  return join(
    stage,
    `${name}-${version(source)}.tgz`,
  );
};
const consume = (
  lane: string,
  packages: string[],
): void => {
  const cwd = join(scratch, lane);
  mkdirSync(cwd);
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
    }),
  );
  npm(cwd, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--save-exact",
    ...packages,
    "typescript@^7.0.2",
    "@types/node@^24",
  ]);
  assert.equal(
    version(
      join(cwd, "node_modules/typescript"),
    ).split(".")[0],
    "7",
  );
  for (const name of ["plgg", "plgg-parser"]) {
    // A symlink here would let sibling dists mask an incomplete npm artifact.
    assert.equal(
      lstatSync(
        join(cwd, "node_modules", name),
      ).isSymbolicLink(),
      false,
    );
  }
  cpSync(
    join(
      root,
      "scripts/fixtures/parser-consumer.ts",
    ),
    join(cwd, "consumer.ts"),
  );
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        // Match the package tsconfig: validate consumer usage, not plgg's
        // existing declaration-internal HKT augmentation diagnostics.
        skipLibCheck: true,
        outDir: "out",
        types: ["node"],
      },
      files: ["consumer.ts"],
    }),
  );
  const compiler = join(
    cwd,
    "node_modules/typescript/bin/tsc",
  );
  execFileSync(
    process.execPath,
    [compiler, "-p", "tsconfig.json"],
    {
      cwd,
      stdio: "inherit",
    },
  );
  execFileSync(
    process.execPath,
    ["--test", "out/consumer.js"],
    {
      cwd,
      stdio: "inherit",
    },
  );
  writeFileSync(
    join(cwd, "invalid.ts"),
    'import { literal, run } from "plgg-parser";\nconst result: number = run(literal("ok"), "ok", 0);\nconsole.log(result);\n',
  );
  const invalid = spawnSync(
    process.execPath,
    [
      compiler,
      "--ignoreConfig",
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "invalid.ts",
    ],
    { cwd, encoding: "utf8" },
  );
  assert.ok(
    invalid.status === 1 || invalid.status === 2,
    invalid.stderr,
  );
  assert.match(
    invalid.stdout,
    /invalid\.ts\(2,7\): error TS2322/,
  );
  console.log(
    `PASS ${lane}: Node ${process.versions.node}, consumer TypeScript ${version(join(cwd, "node_modules/typescript"))}; runtime tests + invalid assignment rejected`,
  );
};
try {
  consume("registry", [
    `plgg-parser@${version(join(root, "packages/plgg-parser"))}`,
  ]);
  consume("packed", [
    pack("plgg"),
    pack("plgg-parser"),
  ]);
} finally {
  rmSync(scratch, {
    recursive: true,
    force: true,
  });
}
