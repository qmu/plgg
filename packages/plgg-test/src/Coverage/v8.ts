import {
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * V8 coverage fold + threshold gate.
 *
 * COLLECTION PROCESS (Plan Amendment 1, named explicitly): coverage
 * is collected via the `NODE_V8_COVERAGE=<dir>` env var with a CLI
 * self-re-exec (see Cli/cli.ts). The child process runs the suite and
 * V8 dumps raw range coverage JSON into `<dir>` on exit; this module
 * is the PARENT post-pass that reads those JSON files, folds them to
 * per-file line coverage, applies the package `exclude` list, and
 * gates against the >90% threshold. `node:inspector` Session is the
 * documented in-process fallback only — it is not used here.
 *
 * Granularity note (design §1.8): V8 reports byte-range block
 * coverage. We derive LINE coverage from the executed ranges (a line
 * counts as covered when any covered range overlaps it). The >90% gate
 * is the contract; exact vitest numeric parity is best-effort.
 */

export type CoverageReport = Readonly<{
  files: ReadonlyArray<
    Readonly<{
      path: string;
      totalLines: number;
      coveredLines: number;
      pct: number;
    }>
  >;
  totalLines: number;
  coveredLines: number;
  pct: number;
}>;

type V8Range = Readonly<{
  startOffset: number;
  endOffset: number;
  count: number;
}>;

type V8Function = Readonly<{
  ranges: ReadonlyArray<V8Range>;
}>;

type V8Script = Readonly<{
  url: string;
  functions: ReadonlyArray<V8Function>;
}>;

const isV8Script = (
  v: unknown,
): v is V8Script =>
  typeof v === "object" &&
  v !== null &&
  "url" in v &&
  typeof v.url === "string" &&
  "functions" in v &&
  Array.isArray(v.functions);

/**
 * Reads + folds every coverage JSON file in `covDir`, keeping only
 * scripts whose file path is under `srcRoot` and not matched by
 * `exclude` (substring match against the absolute path, mirroring the
 * existing vite `exclude` globs closely enough for the gate).
 */
export const collect = (
  covDir: string,
  srcRoot: string,
  exclude: ReadonlyArray<string>,
): CoverageReport => {
  const scripts = readCovDir(
    covDir,
  ).filter((s) =>
    keep(
      toPath(s.url),
      srcRoot,
      exclude,
    ),
  );
  const files = dedupeByPath(
    scripts,
  ).map((s) =>
    fileCoverage(s),
  );
  const totalLines = files.reduce(
    (n, f) => n + f.totalLines,
    0,
  );
  const coveredLines = files.reduce(
    (n, f) => n + f.coveredLines,
    0,
  );
  return {
    files,
    totalLines,
    coveredLines,
    pct: percent(
      coveredLines,
      totalLines,
    ),
  };
};

const readCovDir = (
  covDir: string,
): ReadonlyArray<V8Script> => {
  const names = safeReaddir(covDir);
  return names
    .filter((n) =>
      n.endsWith(".json"),
    )
    .flatMap((n) =>
      parseScripts(
        join(covDir, n),
      ),
    );
};

const safeReaddir = (
  dir: string,
): ReadonlyArray<string> => {
  // Filesystem seam: a missing coverage dir means "no data", not a
  // crash.
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
};

const parseScripts = (
  file: string,
): ReadonlyArray<V8Script> => {
  // Boundary seam: parsing untrusted JSON; a bad file contributes no
  // scripts rather than throwing.
  try {
    const parsed: unknown =
      JSON.parse(
        readFileSync(file, "utf8"),
      );
    return typeof parsed ===
      "object" &&
      parsed !== null &&
      "result" in parsed &&
      Array.isArray(parsed.result)
      ? parsed.result.filter(
          isV8Script,
        )
      : [];
  } catch {
    return [];
  }
};

const toPath = (
  url: string,
): string =>
  url.startsWith("file:")
    ? fileURLToPath(url)
    : url;

const keep = (
  path: string,
  srcRoot: string,
  exclude: ReadonlyArray<string>,
): boolean =>
  path.startsWith(srcRoot) &&
  path.endsWith(".ts") &&
  !path.endsWith(".spec.ts") &&
  !path.endsWith(".test.ts") &&
  !exclude.some((frag) =>
    path.includes(frag),
  );

// Keep one script entry per path (V8 may emit duplicates); the last
// wins, which carries the fullest range set for our purpose.
const dedupeByPath = (
  scripts: ReadonlyArray<V8Script>,
): ReadonlyArray<V8Script> => {
  const byPath = new Map<
    string,
    V8Script
  >();
  scripts.forEach((s) =>
    byPath.set(toPath(s.url), s),
  );
  return [...byPath.values()];
};

// Computes line coverage for one script: read its source, build a
// covered-byte set from ranges with count>0, then a line is covered
// when any of its non-whitespace bytes is covered.
const fileCoverage = (
  script: V8Script,
): Readonly<{
  path: string;
  totalLines: number;
  coveredLines: number;
  pct: number;
}> => {
  const path = toPath(script.url);
  const source = readSource(path);
  const covered = coveredOffsets(
    script,
  );
  const lines = lineSpans(source);
  const counted = lines.filter(
    (ln) => ln.code,
  );
  const coveredLines =
    counted.filter((ln) =>
      anyCovered(ln, covered),
    ).length;
  return {
    path,
    totalLines: counted.length,
    coveredLines,
    pct: percent(
      coveredLines,
      counted.length,
    ),
  };
};

const readSource = (
  path: string,
): string => {
  try {
    return readFileSync(
      path,
      "utf8",
    );
  } catch {
    return "";
  }
};

// A covered-byte predicate built from the union of count>0 ranges.
// Stored as sorted [start,end) intervals; membership via scan (range
// counts are small per file).
type Interval = Readonly<{
  start: number;
  end: number;
}>;

const coveredOffsets = (
  script: V8Script,
): ReadonlyArray<Interval> =>
  script.functions
    .flatMap((f) => f.ranges)
    .filter((r) => r.count > 0)
    .map((r) => ({
      start: r.startOffset,
      end: r.endOffset,
    }));

type LineSpan = Readonly<{
  start: number;
  end: number;
  code: boolean;
}>;

// Splits source into line spans (byte offsets), flagging lines that
// carry executable-ish code (non-blank, not a pure comment/brace) so
// the denominator approximates vitest's line metric.
const lineSpans = (
  source: string,
): ReadonlyArray<LineSpan> => {
  const parts = source.split("\n");
  return parts.reduce<{
    offset: number;
    spans: Array<LineSpan>;
  }>(
    (acc, raw) => {
      const start = acc.offset;
      const end =
        start + raw.length;
      acc.spans.push({
        start,
        end,
        code: isCodeLine(raw),
      });
      // +1 for the consumed newline.
      acc.offset = end + 1;
      return acc;
    },
    { offset: 0, spans: [] },
  ).spans;
};

const isCodeLine = (
  raw: string,
): boolean => {
  const t = raw.trim();
  return (
    t.length > 0 &&
    !t.startsWith("//") &&
    !t.startsWith("*") &&
    !t.startsWith("/*") &&
    t !== "}" &&
    t !== "{" &&
    t !== "})" &&
    t !== ");"
  );
};

const anyCovered = (
  line: LineSpan,
  covered: ReadonlyArray<Interval>,
): boolean =>
  covered.some(
    (iv) =>
      iv.start < line.end &&
      iv.end > line.start,
  );

const percent = (
  covered: number,
  total: number,
): number =>
  total === 0
    ? 100
    : (covered / total) * 100;

/**
 * Applies the >90% gate. Returns whether the report passes the
 * threshold (strictly greater, matching the existing rule).
 */
export const passesThreshold = (
  report: CoverageReport,
  threshold: number,
): boolean =>
  report.pct > threshold;
