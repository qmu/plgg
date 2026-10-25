import { test, check, toBe } from "plgg-test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { consumerTscBin } from "plgg-bundle/vendors/consumerCompiler";

// Real Node resolution against both published entry
// layouts, outside the workspace's own compiler tree.
for (const main of [
  "lib/typescript.js",
  "lib/version.cjs",
]) {
  test(`consumerTscBin resolves ${main} from the requested consumer`, () => {
    const root = mkdtempSync(
      join(tmpdir(), "consumer-compiler-"),
    );
    const dependency = join(
      root,
      "node_modules/typescript",
    );
    try {
      mkdirSync(join(dependency, "lib"), {
        recursive: true,
      });
      writeFileSync(
        join(root, "package.json"),
        "{}",
      );
      writeFileSync(
        join(dependency, "package.json"),
        JSON.stringify({ main }),
      );
      writeFileSync(join(dependency, main), "");
      return check(
        consumerTscBin(root),
        toBe(join(dependency, "bin/tsc")),
      );
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
}

test("consumerTscBin finds hoisted TS7 before the CLI's nested TS6", () => {
  const root = mkdtempSync(
    join(tmpdir(), "consumer-compiler-"),
  );
  const consumer = join(root, "packages/library");
  const dependency = join(
    root,
    "node_modules/typescript",
  );
  const cliDependency = join(
    root,
    "node_modules/plgg-bundle/node_modules/typescript",
  );
  try {
    mkdirSync(consumer, { recursive: true });
    writeFileSync(
      join(consumer, "package.json"),
      "{}",
    );
    for (const { directory, main } of [
      {
        directory: dependency,
        main: "version.cjs",
      },
      {
        directory: cliDependency,
        main: "typescript.js",
      },
    ]) {
      mkdirSync(join(directory, "lib"), {
        recursive: true,
      });
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({ main: `lib/${main}` }),
      );
      writeFileSync(
        join(directory, "lib", main),
        "",
      );
    }
    return check(
      consumerTscBin(consumer),
      toBe(join(dependency, "bin/tsc")),
    );
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
