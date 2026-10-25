import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/** Exercise an installed CLI twice; --help never reaches the app build path. */
export const smokeBundle = (
  consumer: string,
): string => {
  mkdirSync(join(consumer, "src"), {
    recursive: true,
  });
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
      alias: { prefix: "smoke", srcRoot: "src" },
    };\n`,
  );
  // Each start must emit fresh executable output, not reuse the previous build.
  for (const generation of [1, 2]) {
    writeFileSync(
      join(consumer, "src", "main.ts"),
      `const generation: number = ${generation}; console.log(generation);\n`,
    );
    rmSync(join(consumer, "dist"), {
      recursive: true,
      force: true,
    });
    execFileSync(
      process.execPath,
      [
        join(
          consumer,
          "node_modules",
          "plgg-bundle",
          "bin",
          "plgg-bundle.mjs",
        ),
      ],
      {
        cwd: consumer,
        stdio: "pipe",
        timeout: 60_000,
      },
    );
    assert.equal(
      execFileSync(
        process.execPath,
        [join(consumer, "dist", "main.js")],
        {
          cwd: consumer,
          encoding: "utf8",
          timeout: 10_000,
        },
      ).trim(),
      String(generation),
      `app build ${generation} must execute the updated input`,
    );
  }
  return "two app builds + execution ok";
};
