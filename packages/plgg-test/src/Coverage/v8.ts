import {
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { transpile } from "../Resolve/hook.js";
import { generatedToSource } from "./sourcemap.js";

/**
 * V8 coverage fold + four-metric threshold gate.
 *
 * COLLECTION PROCESS (Plan Amendment 1, named explicitly): coverage is
 * collected via `NODE_V8_COVERAGE=<dir>` with a CLI self-re-exec (see
 * Cli + bin launcher). The child runs the suite and V8 dumps raw range
 * coverage JSON; this module is the PARENT post-pass that folds those
 * ranges into per-file metrics and gates against per-package
 * thresholds. `node:inspector` Session is the documented fallback only.
 *
 * FOUR METRICS (Iteration-1: restore parity with the vitest config it
 * replaces, which gated statements/branches/functions/lines):
 *  - functions: a V8 `function` is covered iff its OUTER range count>0.
 *    This is what fixes the edge case where a never-CALLED top-level
 *    function would otherwise score as line-covered — its outer range
 *    has count 0, so it counts against function coverage AND its lines
 *    resolve to an enclosing count-0 range (uncovered).
 *  - branches: each BLOCK range inside a function (the ranges past the
 *    function's first/outer range) is a branch; covered iff count>0.
 *  - lines / statements: line granularity, attributed to ORIGINAL
 *    source lines through the transpile source map (V8 records against
 *    the transpiled output). `statements` mirrors `lines` here — V8 is
 *    range/block based, not statement-AST based, so per design §1.8 the
 *    statement metric is the line metric (an honest proxy; the gate is
 *    the contract, not byte-identical vitest numbers).
 *
 * ACCURACY: specs/sources execute as TRANSPILED JS, so V8 ranges are
 * over OUTPUT bytes; we re-transpile each file identically to recover
 * its source map and remap covered output lines back to source lines.
 */

export type Metric = Readonly<{
  covered: number;
  total: number;
  pct: number;
}>;

export type FileCoverage = Readonly<{
  path: string;
  statements: Metric;
  branches: Metric;
  functions: Metric;
  lines: Metric;
}>;

export type CoverageReport = Readonly<{
  files: ReadonlyArray<FileCoverage>;
  statements: Metric;
  branches: Metric;
  functions: Metric;
  lines: Metric;
}>;

type V8Range = Readonly<{
  startOffset: number;
  endOffset: number;
  count: number;
}>;

type V8Function = Readonly<{
  functionName: string;
  ranges: ReadonlyArray<V8Range>;
  isBlockCoverage: boolean;
}>;

type V8Script = Readonly<{
  url: string;
  functions: ReadonlyArray<V8Function>;
}>;

const isV8Range = (v: unknown): v is V8Range =>
  typeof v === "object" &&
  v !== null &&
  "startOffset" in v &&
  typeof v.startOffset === "number" &&
  "endOffset" in v &&
  typeof v.endOffset === "number" &&
  "count" in v &&
  typeof v.count === "number";

const isV8Function = (
  v: unknown,
): v is V8Function =>
  typeof v === "object" &&
  v !== null &&
  "ranges" in v &&
  Array.isArray(v.ranges) &&
  v.ranges.every(isV8Range);

const isV8Script = (v: unknown): v is V8Script =>
  typeof v === "object" &&
  v !== null &&
  "url" in v &&
  typeof v.url === "string" &&
  "functions" in v &&
  Array.isArray(v.functions) &&
  v.functions.every(isV8Function);

export const collect = (
  covDir: string,
  srcRoot: string,
  exclude: ReadonlyArray<string>,
): CoverageReport => {
  const scripts = dedupeByPath(
    readCovDir(covDir).filter((s) =>
      keep(toPath(s.url), srcRoot, exclude),
    ),
  );
  const files = scripts.map(fileCoverage);
  return {
    files,
    statements: sumMetric(
      files.map((f) => f.statements),
    ),
    branches: sumMetric(
      files.map((f) => f.branches),
    ),
    functions: sumMetric(
      files.map((f) => f.functions),
    ),
    lines: sumMetric(files.map((f) => f.lines)),
  };
};

const sumMetric = (
  ms: ReadonlyArray<Metric>,
): Metric => {
  const covered = ms.reduce(
    (n, m) => n + m.covered,
    0,
  );
  const total = ms.reduce(
    (n, m) => n + m.total,
    0,
  );
  return {
    covered,
    total,
    pct: percent(covered, total),
  };
};

const readCovDir = (
  covDir: string,
): ReadonlyArray<V8Script> =>
  safeReaddir(covDir)
    .filter((n) => n.endsWith(".json"))
    .flatMap((n) =>
      parseScripts(join(covDir, n)),
    );

const safeReaddir = (
  dir: string,
): ReadonlyArray<string> => {
  // Filesystem seam: a missing coverage dir means "no data".
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
};

const parseScripts = (
  file: string,
): ReadonlyArray<V8Script> => {
  // Boundary seam: a bad JSON file contributes no scripts.
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(file, "utf8"),
    );
    return typeof parsed === "object" &&
      parsed !== null &&
      "result" in parsed &&
      Array.isArray(parsed.result)
      ? parsed.result.filter(isV8Script)
      : [];
  } catch {
    return [];
  }
};

const toPath = (url: string): string => {
  const noQuery =
    url.indexOf("?") === -1
      ? url
      : url.slice(0, url.indexOf("?"));
  return noQuery.startsWith("file:")
    ? fileURLToPath(noQuery)
    : noQuery;
};

const keep = (
  path: string,
  srcRoot: string,
  exclude: ReadonlyArray<string>,
): boolean =>
  path.startsWith(srcRoot) &&
  path.endsWith(".ts") &&
  !path.endsWith(".spec.ts") &&
  !path.endsWith(".test.ts") &&
  !exclude.some((frag) => path.includes(frag));

const dedupeByPath = (
  scripts: ReadonlyArray<V8Script>,
): ReadonlyArray<V8Script> => {
  const byPath = new Map<string, V8Script>();
  scripts.forEach((s) =>
    byPath.set(toPath(s.url), s),
  );
  return [...byPath.values()];
};

const fileCoverage = (
  script: V8Script,
): FileCoverage => {
  const path = toPath(script.url);
  const source = readSource(path);
  const output = transpile(source, path);
  const mapping = generatedToSource(
    extractMappings(output),
  );
  const spans = lineSpans(output);
  return {
    path,
    statements: lineMetric(
      script,
      spans,
      mapping,
    ),
    lines: lineMetric(script, spans, mapping),
    functions: functionMetric(script),
    branches: branchMetric(script),
  };
};

// Lines/statements: a source line is covered iff some generated line
// mapping to it falls in a count>0 INNERMOST range.
const lineMetric = (
  script: V8Script,
  spans: ReadonlyArray<LineSpan>,
  mapping: ReadonlyMap<
    number,
    ReadonlySet<number>
  >,
): Metric => {
  const coveredOut = coveredOutputLines(
    script,
    spans,
  );
  const sourceLineHits = new Map<
    number,
    boolean
  >();
  mapping.forEach((srcLines, genLine) => {
    const hit = coveredOut.has(genLine);
    srcLines.forEach((sl) =>
      sourceLineHits.set(
        sl,
        (sourceLineHits.get(sl) ?? false) || hit,
      ),
    );
  });
  const total = sourceLineHits.size;
  const covered = [
    ...sourceLineHits.values(),
  ].filter(Boolean).length;
  return {
    covered,
    total,
    pct: percent(covered, total),
  };
};

// Functions: V8 lists every function; its FIRST range is the function
// body range. Covered iff that range's count > 0. The synthetic
// top-level module wrapper (empty functionName spanning the file) is
// excluded so it neither inflates nor deflates the metric.
const functionMetric = (
  script: V8Script,
): Metric => {
  const fns = script.functions.filter(
    (f, idx) =>
      !(idx === 0 && f.functionName === ""),
  );
  const total = fns.length;
  const covered = fns.filter((f) => {
    const outer = f.ranges[0];
    return outer !== undefined && outer.count > 0;
  }).length;
  return {
    covered,
    total,
    pct: percent(covered, total),
  };
};

// Branches: every BLOCK range past a function's outer range is a
// branch arm; covered iff count>0. Only block-coverage functions carry
// branch sub-ranges.
const branchMetric = (
  script: V8Script,
): Metric => {
  const branchRanges = script.functions.flatMap(
    (f) => f.ranges.slice(1),
  );
  const total = branchRanges.length;
  const covered = branchRanges.filter(
    (r) => r.count > 0,
  ).length;
  return {
    covered,
    total,
    pct: percent(covered, total),
  };
};

const readSource = (path: string): string => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
};

const extractMappings = (
  output: string,
): string => {
  const marker =
    "sourceMappingURL=data:application/json;base64,";
  const at = output.lastIndexOf(marker);
  if (at === -1) {
    return "";
  }
  const b64 = output
    .slice(at + marker.length)
    .trim();
  try {
    const json: unknown = JSON.parse(
      Buffer.from(b64, "base64").toString("utf8"),
    );
    return typeof json === "object" &&
      json !== null &&
      "mappings" in json &&
      typeof json.mappings === "string"
      ? json.mappings
      : "";
  } catch {
    return "";
  }
};

type Range = Readonly<{
  start: number;
  end: number;
  count: number;
}>;

// Generated (output) line numbers (0-based) V8 marks executed, by the
// INNERMOST enclosing range's count (so uncovered branches/uncalled
// functions, whose innermost range is count 0, are NOT counted).
const coveredOutputLines = (
  script: V8Script,
  spans: ReadonlyArray<LineSpan>,
): ReadonlySet<number> => {
  const ranges: ReadonlyArray<Range> =
    script.functions
      .flatMap((f) => f.ranges)
      .map((r) => ({
        start: r.startOffset,
        end: r.endOffset,
        count: r.count,
      }));
  const hit = new Set<number>();
  spans.forEach((span, idx) => {
    const probe = span.start;
    const innermost = ranges
      .filter(
        (r) => r.start <= probe && r.end > probe,
      )
      .sort(
        (a, b) =>
          a.end - a.start - (b.end - b.start),
      )[0];
    if (
      innermost !== undefined &&
      innermost.count > 0
    ) {
      hit.add(idx);
    }
  });
  return hit;
};

type LineSpan = Readonly<{
  start: number;
  end: number;
}>;

const lineSpans = (
  text: string,
): ReadonlyArray<LineSpan> =>
  text.split("\n").reduce<{
    offset: number;
    spans: Array<LineSpan>;
  }>(
    (acc, raw) => {
      const start = acc.offset;
      const end = start + raw.length;
      acc.spans.push({ start, end });
      acc.offset = end + 1;
      return acc;
    },
    { offset: 0, spans: [] },
  ).spans;

const percent = (
  covered: number,
  total: number,
): number =>
  total === 0 ? 100 : (covered / total) * 100;

/**
 * Per-metric gate: every metric must be strictly greater than the
 * threshold (matching the existing >N rule).
 */
export const passesThreshold = (
  report: CoverageReport,
  threshold: number,
): boolean =>
  report.statements.pct > threshold &&
  report.branches.pct > threshold &&
  report.functions.pct > threshold &&
  report.lines.pct > threshold;
