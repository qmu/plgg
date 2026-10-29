import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function requireNode24(
  version: string,
): void {
  if (!/^24\./.test(version))
    throw new Error(
      "Public plgg-test gate requires Node 24",
    );
}

export function requireTestEngine(
  manifest: unknown,
): string {
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("name" in manifest) ||
    manifest.name !== "plgg-test" ||
    !("engines" in manifest) ||
    typeof manifest.engines !== "object" ||
    manifest.engines === null ||
    !("node" in manifest.engines) ||
    typeof manifest.engines.node !== "string" ||
    manifest.engines.node.trim() === ""
  ) {
    throw new Error(
      "Public plgg-test tarball is missing engines.node or has an invalid identity",
    );
  }
  return manifest.engines.node;
}

export const installedProbe = `
import { createRequire } from "node:module";
import { strictEqual, notStrictEqual } from "node:assert";
const consumer = createRequire(process.cwd() + "/package.json");
const runner = createRequire(process.cwd() + "/node_modules/plgg-test/bin/plgg-test.mjs");
const consumerPath = consumer.resolve("typescript");
const runnerPath = runner.resolve("typescript");
strictEqual(consumer("typescript").version.split(".")[0], "7");
strictEqual(runner("typescript").version.split(".")[0], "6");
strictEqual(typeof runner("typescript").transpileModule, "function");
notStrictEqual(consumerPath, runnerPath);
console.log("consumer TS7 / runner TS6 / transpileModule: PASS");
`;

export function requireExecutedFixture(
  output: string,
): void {
  if (
    !/\b1 passed, 0 failed, 0 skipped\b/.test(
      output,
    )
  )
    throw new Error(
      "Public CLI did not execute exactly one passing fixture",
    );
}

export function gatePublicTest(
  version = "latest",
): void {
  requireNode24(process.versions.node);
  if (
    !/^(latest|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.test(
      version,
    )
  )
    throw new Error(
      "Expected latest or an exact plgg-test version",
    );
  const directory = mkdtempSync(
    join(tmpdir(), "plgg-test-public-"),
  );
  let phase = "download";
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    run("npm", [
      "pack",
      `plgg-test@${version}`,
      "--ignore-scripts",
      "--registry=https://registry.npmjs.org",
    ]);
    const archives = readdirSync(
      directory,
    ).filter((name) => name.endsWith(".tgz"));
    const archive = archives[0];
    if (
      archives.length !== 1 ||
      archive === undefined
    )
      throw new Error(
        "Expected one public tarball",
      );
    phase = "engines";
    const manifest: unknown = JSON.parse(
      run("tar", [
        "-xOzf",
        archive,
        "package/package.json",
      ]),
    );
    const range = requireTestEngine(manifest);
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
      }),
    );
    // npm's semver engine validator rejects incompatible AND malformed ranges.
    // ignore-scripts prevents public install hooks; the CLI is executed explicitly below.
    run("npm", [
      "install",
      "--engine-strict",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--registry=https://registry.npmjs.org",
      `./${archive}`,
      "typescript@7",
      "@types/node@24",
    ]);
    console.log(
      `engines.node ${range}: PASS on Node ${process.versions.node}`,
    );
    phase = "compiler resolution";
    console.log(
      run(process.execPath, [
        "--input-type=module",
        "-e",
        installedProbe,
      ]).trim(),
    );
    mkdirSync(join(directory, "src"));
    writeFileSync(
      join(directory, "src/consumer.spec.ts"),
      readFileSync(
        new URL(
          "./fixtures/public-plgg-test/consumer.spec.ts",
          import.meta.url,
        ),
      ),
    );
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          types: ["node"],
        },
        files: ["src/consumer.spec.ts"],
      }),
    );
    phase = "public CLI execution";
    const execution = run(process.execPath, [
      "node_modules/plgg-test/bin/plgg-test.mjs",
      "src",
    ]);
    requireExecutedFixture(execution);
    console.log(execution.trim());
    phase = "consumer TS7 typecheck";
    run(process.execPath, [
      "node_modules/typescript/bin/tsc",
      "--noEmit",
      "-p",
      "tsconfig.json",
    ]);
    phase = "negative typecheck";
    writeFileSync(
      join(directory, "src/consumer.spec.ts"),
      'const rejected: number = "wrong";\n',
    );
    let rejected = false;
    try {
      run(process.execPath, [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "-p",
        "tsconfig.json",
      ]);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "stdout" in error &&
        typeof error.stdout === "string" &&
        error.stdout.includes("TS2322")
      )
        rejected = true;
    }
    if (!rejected)
      throw new Error(
        "Consumer compiler did not reject TS2322 control",
      );
    console.log(
      "public CLI / consumer TS7 / TS2322 negative control: PASS",
    );
  } catch (error) {
    // Suppress child output: npm diagnostics can contain private host configuration.
    const detail =
      error instanceof Error &&
      !("status" in error)
        ? `: ${error.message}`
        : "";
    throw new Error(
      `Public plgg-test gate failed at ${phase}${detail}`,
    );
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url ===
    pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.length > 3)
      throw new Error(
        "Usage: node scripts/publicTestConsumer.ts [version]",
      );
    gatePublicTest(process.argv[2]);
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Public plgg-test gate failed",
    );
    process.exitCode = 1;
  }
}
