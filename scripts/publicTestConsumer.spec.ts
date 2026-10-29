import {
  strictEqual,
  throws,
  match,
} from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  installedProbe,
  requireExecutedFixture,
  requireNode24,
  requireTestEngine,
} from "./publicTestConsumer.ts";

test("requires actual Node 24", () => {
  requireNode24("24.22.1");
  for (const version of [
    "22.23.4",
    "25.0.0",
    "124.0.0",
  ])
    throws(
      () => requireNode24(version),
      /requires Node 24/,
    );
});

test("requires the public tarball identity and explicit engines", () => {
  strictEqual(
    requireTestEngine({
      name: "plgg-test",
      engines: { node: ">=24" },
    }),
    ">=24",
  );
  for (const manifest of [
    null,
    {},
    { name: "plgg" },
    { name: "plgg-test" },
    { name: "plgg-test", engines: { node: " " } },
    { name: "plgg-test", engines: { node: 24 } },
  ])
    throws(
      () => requireTestEngine(manifest),
      /engines.node/,
    );
});

for (const scenario of [
  "split",
  "hoisted",
  "wrong consumer",
  "no transpiler",
]) {
  test(`physical public-bin resolution: ${scenario}`, () => {
    const directory = mkdtempSync(
      join(tmpdir(), "public-test-probe-"),
    );
    try {
      const put = (
        path: string,
        value: string,
      ) => {
        const target = join(directory, path);
        mkdirSync(target, { recursive: true });
        writeFileSync(
          join(target, "index.js"),
          value,
        );
      };
      writeFileSync(
        join(directory, "package.json"),
        '{"type":"module"}',
      );
      put(
        "node_modules/typescript",
        `exports.version = "${scenario === "wrong consumer" ? "6" : "7"}.0.2";`,
      );
      mkdirSync(
        join(
          directory,
          "node_modules/plgg-test/bin",
        ),
        {
          recursive: true,
        },
      );
      if (scenario !== "hoisted")
        put(
          "node_modules/plgg-test/node_modules/typescript",
          `exports.version = "6.0.3"; ${scenario === "no transpiler" ? "" : "exports.transpileModule = () => {};"}`,
        );
      const run = () =>
        execFileSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            installedProbe,
          ],
          {
            cwd: directory,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
      if (scenario === "split")
        match(run(), /PASS/);
      else throws(run);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });
}

for (const range of [
  ">=0",
  "<0",
  "not-a-range",
]) {
  test(`npm engine-strict validates packed declaration ${range}`, () => {
    const directory = mkdtempSync(
      join(tmpdir(), "public-test-engine-"),
    );
    try {
      const source = join(directory, "source");
      const consumer = join(
        directory,
        "consumer",
      );
      mkdirSync(source);
      mkdirSync(consumer);
      writeFileSync(
        join(source, "package.json"),
        JSON.stringify({
          name: "plgg-test",
          version: "0.0.0",
          engines: { node: range },
        }),
      );
      writeFileSync(
        join(consumer, "package.json"),
        '{"private":true}',
      );
      execFileSync(
        "npm",
        [
          "pack",
          source,
          "--ignore-scripts",
          "--pack-destination",
          directory,
        ],
        { stdio: "pipe" },
      );
      const run = () =>
        execFileSync(
          "npm",
          [
            "install",
            "--engine-strict",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            join(
              directory,
              "plgg-test-0.0.0.tgz",
            ),
          ],
          { cwd: consumer, stdio: "pipe" },
        );
      if (range === ">=0") run();
      else throws(run);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  });
}

test("CLI must execute the fixture instead of silently finding zero tests", () => {
  requireExecutedFixture(
    "1 passed, 0 failed, 0 skipped",
  );
  for (const output of [
    "0 passed, 0 failed, 0 skipped",
    "0 passed, 1 failed, 0 skipped",
    "1 passed, 0 failed, 1 skipped",
    "",
  ])
    throws(
      () => requireExecutedFixture(output),
      /exactly one/,
    );
});
