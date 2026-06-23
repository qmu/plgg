import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
} from "../index.js";
import {
  collect,
  passesThreshold,
} from "./v8.js";
import type { CoverageReport } from "./v8.js";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const withScratch = <T>(
  fn: (dir: string) => T,
): T => {
  const dir = mkdtempSync(
    join(tmpdir(), "plgg-cov-"),
  );
  try {
    return fn(dir);
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true,
    });
  }
};

const m = {
  covered: 1,
  total: 1,
  pct: 100,
};

const report = (
  pcts: Readonly<{
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  }>,
): CoverageReport => ({
  files: [],
  statements: {
    ...m,
    pct: pcts.statements,
  },
  branches: {
    ...m,
    pct: pcts.branches,
  },
  functions: {
    ...m,
    pct: pcts.functions,
  },
  lines: { ...m, pct: pcts.lines },
});

test("collect folds full-coverage ranges into four metrics", () =>
  withScratch((srcDir) =>
    withScratch((covDir) => {
      const tsPath = join(srcDir, "mod.ts");
      writeFileSync(
        tsPath,
        "export const f = (\n  n: number,\n): number => n + 1;\n",
      );
      writeFileSync(
        join(covDir, "c.json"),
        JSON.stringify({
          result: [
            {
              url: pathToFileURL(tsPath).href,
              functions: [
                {
                  functionName: "",
                  isBlockCoverage: true,
                  ranges: [
                    {
                      startOffset: 0,
                      endOffset: 100000,
                      count: 1,
                    },
                  ],
                },
                {
                  functionName: "f",
                  isBlockCoverage: true,
                  ranges: [
                    {
                      startOffset: 0,
                      endOffset: 100000,
                      count: 1,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );
      const rep = collect(covDir, srcDir, []);
      return all([
        check(rep.files.length, toBe(1)),
        check(rep.lines.pct, toBe(100)),
        check(rep.functions.pct, toBe(100)),
      ]);
    }),
  ));

test("an uncalled function counts against function coverage", () =>
  withScratch((srcDir) =>
    withScratch((covDir) => {
      const tsPath = join(srcDir, "mod.ts");
      writeFileSync(
        tsPath,
        "export const used = () => 1;\nexport const unused = () => 2;\n",
      );
      writeFileSync(
        join(covDir, "c.json"),
        JSON.stringify({
          result: [
            {
              url: pathToFileURL(tsPath).href,
              functions: [
                {
                  functionName: "",
                  isBlockCoverage: true,
                  ranges: [
                    {
                      startOffset: 0,
                      endOffset: 100000,
                      count: 1,
                    },
                  ],
                },
                {
                  functionName: "used",
                  isBlockCoverage: true,
                  ranges: [
                    {
                      startOffset: 0,
                      endOffset: 10,
                      count: 1,
                    },
                  ],
                },
                {
                  functionName: "unused",
                  isBlockCoverage: true,
                  ranges: [
                    {
                      startOffset: 0,
                      endOffset: 10,
                      count: 0,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );
      const rep = collect(covDir, srcDir, []);
      // 1 of 2 declared functions executed → 50%, never 100%.
      return check(rep.functions.pct, toBe(50));
    }),
  ));

test("threshold gate requires ALL four metrics strictly greater", () =>
  all([
    check(
      passesThreshold(
        report({
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        }),
        90,
      ),
      toBe(true),
    ),
    // One metric exactly at the threshold (not strictly greater) fails.
    check(
      passesThreshold(
        report({
          statements: 100,
          branches: 90,
          functions: 100,
          lines: 100,
        }),
        90,
      ),
      toBe(false),
    ),
  ]));

test("missing coverage dir yields an empty report", () => {
  const rep = collect(
    "/no/such/dir/here",
    "/x",
    [],
  );
  return all([
    check(rep.files, toHaveLength(0)),
    check(rep.lines.pct, toBe(100)),
  ]);
});

test("collect honors the exclude list", () =>
  withScratch((srcDir) =>
    withScratch((covDir) => {
      const tsPath = join(
        srcDir,
        "Abstracts",
        "x.ts",
      );
      writeFileSync(
        join(covDir, "c.json"),
        JSON.stringify({
          result: [
            {
              url: pathToFileURL(tsPath).href,
              functions: [],
            },
          ],
        }),
      );
      const rep = collect(covDir, srcDir, [
        "/Abstracts/",
      ]);
      return check(rep.files, toHaveLength(0));
    }),
  ));

test("malformed coverage JSON contributes no scripts", () =>
  withScratch((srcDir) =>
    withScratch((covDir) => {
      writeFileSync(
        join(covDir, "bad.json"),
        "{ not valid json",
      );
      writeFileSync(
        join(covDir, "noresult.json"),
        JSON.stringify({ x: 1 }),
      );
      writeFileSync(
        join(covDir, "skip.txt"),
        "ignored",
      );
      const rep = collect(covDir, srcDir, []);
      return check(rep.files, toHaveLength(0));
    }),
  ));

test("a script whose source is unreadable yields zero-line file", () =>
  withScratch((covDir) => {
    // Point at a .ts path that does not exist on disk.
    writeFileSync(
      join(covDir, "c.json"),
      JSON.stringify({
        result: [
          {
            url: pathToFileURL(
              join(
                "/tmp",
                "plgg-missing-src-x",
                "gone.ts",
              ),
            ).href,
            functions: [],
          },
        ],
      }),
    );
    const rep = collect(
      covDir,
      "/tmp/plgg-missing-src-x",
      [],
    );
    return all([
      check(rep.files.length, toBe(1)),
      check(rep.lines.total, toBe(0)),
    ]);
  }));
