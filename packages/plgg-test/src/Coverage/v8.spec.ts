import { test, expect } from "plgg-test/index";
import {
  collect,
  passesThreshold,
} from "plgg-test/Coverage/v8";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// A real end-to-end fold: write a `.ts` source, hand V8-style coverage
// JSON whose ranges cover the WHOLE transpiled output, and confirm
// collect() reconstructs the source map and reports full coverage for
// that file. (Range→line precision is covered by sourcemap.spec.ts;
// here we prove the wiring: read dir, keep .ts, remap, gate.)
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

test("collect remaps full-coverage ranges to a source file", () => {
  withScratch((srcDir) =>
    withScratch((covDir) => {
      const tsPath = join(srcDir, "mod.ts");
      const source =
        "export const f = (\n  n: number,\n): number => n + 1;\n";
      writeFileSync(tsPath, source);
      // A range from 0..big covers every output byte → every mapped
      // source line counts as covered.
      writeFileSync(
        join(covDir, "c.json"),
        JSON.stringify({
          result: [
            {
              url: pathToFileURL(tsPath).href,
              functions: [
                {
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
      expect(rep.files.length).toBe(1);
      expect(rep.pct).toBe(100);
    }),
  );
});

test("collect honors the exclude list", () => {
  withScratch((srcDir) =>
    withScratch((covDir) => {
      const tsPath = join(
        srcDir,
        "Abstracts",
        "x.ts",
      );
      // Excluded by fragment; expect no files.
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
      expect(rep.files).toEqual([]);
    }),
  );
});

test("threshold gate is strictly greater", () => {
  expect(
    passesThreshold(
      {
        files: [],
        totalLines: 10,
        coveredLines: 10,
        pct: 100,
      },
      90,
    ),
  ).toBe(true);
  expect(
    passesThreshold(
      {
        files: [],
        totalLines: 10,
        coveredLines: 9,
        pct: 90,
      },
      90,
    ),
  ).toBe(false);
});

test("missing coverage dir yields empty report", () => {
  const rep = collect(
    "/no/such/dir/here",
    "/x",
    [],
  );
  expect(rep.files).toEqual([]);
  expect(rep.pct).toBe(100);
});
