// Complement #186's successful consumer: prove the packed CLI rejects a
// discovered failing enum test, rather than accepting exit 0 or a loader crash.
// Run after build.sh: npx --yes --package=node@24 node scripts/gate-test-npm-failure.mjs
import { strictEqual, match } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stageEntries, stagedManifest } from "./stagePackage.ts";

strictEqual(process.versions.node.split(".")[0], "24", "Node 24 required");
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scratch = mkdtempSync(join(tmpdir(), "plgg-test-failure-"));
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, NODE_PATH: "" },
  });
  strictEqual(result.status, 0, `${command} failed (child output suppressed)`);
  return result.stdout;
};
try {
  const archives = [];
  for (const name of ["plgg", "plgg-test"]) {
    const source = join(root, "packages", name);
    const pkg = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
    const stage = join(scratch, name);
    mkdirSync(stage);
    for (const entry of stageEntries(pkg)) {
      if (existsSync(join(source, entry)))
        cpSync(join(source, entry), join(stage, entry), { recursive: true });
    }
    writeFileSync(
      join(stage, "package.json"),
      stagedManifest(
        pkg,
        (spec) =>
          JSON.parse(
            readFileSync(
              resolve(source, spec.slice(5), "package.json"),
              "utf8",
            ),
          ).version,
      ),
    );
    run(
      "npm",
      ["pack", "--ignore-scripts", "--silent", "--pack-destination", scratch],
      stage,
    );
    archives.push(join(scratch, `${name}-${pkg.version}.tgz`));
  }
  const consumer = join(scratch, "consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    '{"private":true,"type":"module"}',
  );
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...archives,
      "typescript@7",
    ],
    consumer,
  );
  const require = createRequire(join(consumer, "package.json"));
  const runnerRoot = join(consumer, "node_modules", "plgg-test");
  // Anchor at the artifact that register.mjs actually loads, not the API entry.
  const hookRequire = createRequire(join(runnerRoot, "dist", "hook.es.js"));
  strictEqual(require("typescript").version.split(".")[0], "7");
  strictEqual(hookRequire("typescript").version.split(".")[0], "6");
  strictEqual(typeof hookRequire("typescript").transpileModule, "function");
  console.log("Node 24 / consumer TS7 / packed hook TS6: PASS");
  mkdirSync(join(consumer, "src"));
  const spec = join(consumer, "src", "failure.spec.ts");
  const fixture = (expected) =>
    `import { test, check, toBe } from "plgg-test";\nenum Answer { value = 42 }\ntest("packed enum failure control", () => check(Answer.value, toBe(${expected})));\n`;
  for (const [expected, status, summary] of [
    [42, 0, /^1 passed, 0 failed, 0 skipped$/m],
    [41, 1, /^0 passed, 1 failed, 0 skipped$/m],
  ]) {
    writeFileSync(spec, fixture(expected));
    const result = spawnSync(
      process.execPath,
      [join(runnerRoot, "bin", "plgg-test.mjs"), "src"],
      {
        cwd: consumer,
        encoding: "utf8",
        timeout: 30_000,
        env: { ...process.env, NODE_PATH: "", NO_COLOR: "1" },
      },
    );
    strictEqual(result.status, status, "packed CLI exit status");
    if (status === 1) match(result.stdout, /packed enum failure control/);
    match(result.stdout, summary, "must discover and execute exactly one test");
    console.log(
      `Packed enum expected=${expected}: exit ${status}, verified test summary`,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
