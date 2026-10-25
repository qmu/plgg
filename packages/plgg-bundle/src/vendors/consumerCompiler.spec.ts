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
