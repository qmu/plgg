import assert from "node:assert/strict";
import {
  packageEvidence,
  writeEvidence,
} from "./publicConsumerEvidence.mjs";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
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
  missingEntryTargets,
} from "./stagePackage.ts";

export const publicSpecifiers = (pkg) => {
  if (!pkg.exports && !pkg.main && !pkg.types)
    return [];
  const exports = pkg.exports;
  const keys =
    exports && typeof exports === "object"
      ? Object.keys(exports)
      : [];
  const subpaths = keys.filter((key) =>
    key.startsWith("."),
  );
  assert.ok(
    !subpaths.some((key) => key.includes("*")),
    `${pkg.name}: wildcard exports need explicit consumer samples`,
  );
  return (
    subpaths.length
      ? subpaths.filter(
          (key) => exports[key] !== null,
        )
      : ["."]
  ).map((key) => pkg.name + key.slice(1));
};

export const checkRuntime = (
  version,
  compilerRange,
) => {
  assert.match(
    version,
    /^24\./,
    "public consumer gate requires Node 24; put Node 24 first on PATH",
  );
  assert.match(
    compilerRange,
    /^\^?7\./,
    "consumer compiler must be TypeScript 7",
  );
};

export const gate = (root) => {
  const evidencePath = join(
    root,
    ".artifacts/public-consumer.json",
  );
  rmSync(evidencePath, { force: true });
  const evidence = [];
  const manifest = (path) =>
    JSON.parse(
      readFileSync(
        join(path, "package.json"),
        "utf8",
      ),
    );
  const compilerRange =
    manifest(root).devDependencies.typescript;
  checkRuntime(
    process.versions.node,
    compilerRange,
  );
  const scratch = mkdtempSync(
    join(tmpdir(), "plgg-public-consumer-"),
  );
  const run = (command, args, cwd) =>
    execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
    });
  try {
    const packages = readdirSync(
      join(root, "packages"),
    )
      .map((name) => join(root, "packages", name))
      .filter((path) =>
        existsSync(join(path, "package.json")),
      )
      .map((path) => ({
        path,
        pkg: manifest(path),
      }))
      .filter(({ pkg }) => !pkg.private);
    const tarballs = [];
    for (const { path, pkg } of packages) {
      const stage = join(scratch, pkg.name);
      mkdirSync(stage, { recursive: true });
      for (const entry of stageEntries(pkg)) {
        if (existsSync(join(path, entry)))
          cpSync(
            join(path, entry),
            join(stage, entry),
            { recursive: true },
          );
      }
      writeFileSync(
        join(stage, "package.json"),
        stagedManifest(
          pkg,
          (spec) =>
            manifest(resolve(path, spec.slice(5)))
              .version,
        ),
      );
      assert.deepEqual(
        missingEntryTargets(pkg, (entry) =>
          existsSync(join(stage, entry)),
        ),
        [],
        `${pkg.name}: declared entry missing from publish stage (check build and files allowlist)`,
      );
      const [{ filename }] = JSON.parse(
        run(
          "npm",
          [
            "pack",
            "--json",
            "--ignore-scripts",
            "--pack-destination",
            scratch,
          ],
          stage,
        ),
      );
      const tarball = join(scratch, filename);
      evidence.push(
        packageEvidence(pkg, tarball),
      );
      tarballs.push(tarball);
    }
    const consumer = join(scratch, "consumer");
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        devDependencies: {
          typescript: compilerRange,
          "@types/node": manifest(
            join(root, "packages/plgg"),
          ).devDependencies["@types/node"],
        },
      }),
    );
    run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        ...tarballs,
      ],
      consumer,
    );
    const installedCompiler = manifest(
      join(consumer, "node_modules/typescript"),
    );
    assert.match(
      installedCompiler.version,
      /^7\./,
    );
    const specifiers = packages.flatMap(
      ({ pkg }) => {
        const installed = join(
          consumer,
          "node_modules",
          pkg.name,
        );
        assert.equal(
          lstatSync(installed).isSymbolicLink(),
          false,
          pkg.name,
        );
        assert.ok(
          realpathSync(installed).startsWith(
            scratch + "/",
          ),
          pkg.name,
        );
        assert.deepEqual(
          missingEntryTargets(pkg, (entry) =>
            existsSync(join(installed, entry)),
          ),
          [],
          `${pkg.name}: declared entry missing from installed tarball`,
        );
        return publicSpecifiers(pkg);
      },
    );
    writeFileSync(
      join(consumer, "consumer.ts"),
      specifiers
        .map(
          (name, i) =>
            `type Surface${i} = typeof import(${JSON.stringify(name)});\nconst surface${i}: keyof Surface${i} | undefined = undefined;\nvoid surface${i};`,
        )
        .join("\n"),
    );
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: ["node"],
        },
        include: ["consumer.ts"],
      }),
    );
    const compiler = join(
      consumer,
      "node_modules/typescript/bin/tsc",
    );
    run(
      process.execPath,
      [compiler, "-p", "tsconfig.json"],
      consumer,
    );
    writeFileSync(
      join(consumer, "negative.ts"),
      'const invalid: number = "wrong";\n',
    );
    assert.throws(
      () =>
        run(
          process.execPath,
          [
            compiler,
            "--ignoreConfig",
            "--noEmit",
            "negative.ts",
          ],
          consumer,
        ),
      (error) =>
        String(error.stdout).includes("TS2322"),
    );
    writeFileSync(
      join(consumer, "runtime.mjs"),
      specifiers
        .map(
          (name) =>
            `await import(${JSON.stringify(name)});`,
        )
        .join("\n"),
    );
    run(
      process.execPath,
      ["runtime.mjs"],
      consumer,
    );
    writeEvidence(root, evidencePath, {
      nodeVersion: process.versions.node,
      typescriptVersion:
        installedCompiler.version,
      packages: evidence,
    });
    console.log(
      `PASS public consumer: Node ${process.versions.node}; consumer TypeScript ${installedCompiler.version}; ${packages.length} packed packages; ${specifiers.length} public imports; negative TS2322 rejected`,
    );
  } finally {
    rmSync(scratch, {
      recursive: true,
      force: true,
    });
  }
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
)
  gate(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
    ),
  );
