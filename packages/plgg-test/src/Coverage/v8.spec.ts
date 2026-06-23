import {
  test,
  expect,
  afterEach,
} from "plgg-test/index";
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

// Each test builds a throwaway src file + a V8 coverage JSON pointing
// at it, so the fold runs against real bytes. Dirs are cleaned up.
const dirs: Array<string> = [];

const scratch = (): string => {
  const d = mkdtempSync(
    join(tmpdir(), "plgg-cov-"),
  );
  dirs.push(d);
  return d;
};

afterEach(() => {
  dirs.splice(0).forEach((d) =>
    rmSync(d, {
      recursive: true,
      force: true,
    }),
  );
});

const writeCov = (
  covDir: string,
  url: string,
  ranges: ReadonlyArray<{
    startOffset: number;
    endOffset: number;
    count: number;
  }>,
): void =>
  writeFileSync(
    join(covDir, "cov.json"),
    JSON.stringify({
      result: [
        {
          url,
          functions: [{ ranges }],
        },
      ],
    }),
  );

test("computes line coverage from ranges", () => {
  const srcDir = scratch();
  const covDir = scratch();
  const src = join(srcDir, "mod.ts");
  // Two code lines.
  const text = "const a = 1;\nconst b = 2;\n";
  writeFileSync(src, text);
  // Cover only the first line (offsets 0..12).
  writeCov(covDir, pathToFileURL(src).href, [
    {
      startOffset: 0,
      endOffset: 12,
      count: 1,
    },
  ]);
  const rep = collect(covDir, srcDir, []);
  expect(rep.files.length).toBe(1);
  expect(rep.files[0]?.coveredLines).toBe(1);
  expect(rep.files[0]?.totalLines).toBe(2);
  expect(rep.pct).toBe(50);
});

test("excludes matched paths and spec files", () => {
  const srcDir = scratch();
  const covDir = scratch();
  const spec = join(srcDir, "mod.spec.ts");
  writeFileSync(spec, "const a = 1;\n");
  writeCov(covDir, pathToFileURL(spec).href, [
    {
      startOffset: 0,
      endOffset: 12,
      count: 1,
    },
  ]);
  const rep = collect(covDir, srcDir, []);
  expect(rep.files.length).toBe(0);
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
    join(scratch(), "nope"),
    "/x",
    [],
  );
  expect(rep.files).toEqual([]);
  expect(rep.pct).toBe(100);
});
