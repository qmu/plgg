import {
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { transpile } from "plgg-test/Resolve/hook";
import { generatedToSource } from "plgg-test/Coverage/sourcemap";

/**
 * V8 coverage fold + threshold gate.
 *
 * COLLECTION PROCESS (Plan Amendment 1, named explicitly): coverage is
 * collected via `NODE_V8_COVERAGE=<dir>` with a CLI self-re-exec (see
 * Cli + bin launcher). The child runs the suite and V8 dumps raw range
 * coverage JSON; this module is the PARENT post-pass that folds those
 * ranges into per-file LINE coverage and gates against the >90%
 * threshold. `node:inspector` Session is the documented fallback only.
 *
 * ACCURACY: specs/sources execute as TRANSPILED JS (the load hook runs
 * `ts.transpileModule`, which reflows code), so V8 ranges are over the
 * OUTPUT bytes. To attribute coverage to the ORIGINAL source lines we
 * re-transpile each file the same way to recover its source map, map
 * V8's covered OUTPUT lines, then remap them to source lines through
 * the map. The denominator is the set of source lines the map
 * references (i.e. real code lines), so the percentage tracks vitest's
 * line metric closely. The >90% gate is the contract.
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

const isV8Script = (v: unknown): v is V8Script =>
  typeof v === "object" &&
  v !== null &&
  "url" in v &&
  typeof v.url === "string" &&
  "functions" in v &&
  Array.isArray(v.functions);

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
    pct: percent(coveredLines, totalLines),
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

// Per-file: transpile the source the same way the load hook does to
// recover the output + its inline source map, compute V8-covered
// OUTPUT lines, then attribute to ORIGINAL source lines via the map.
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
  const output = transpile(source, path);
  const mapping = generatedToSource(
    extractMappings(output),
  );
  const coveredOut = coveredOutputLines(
    script,
    output,
  );
  // All source lines the map references == the real code lines (the
  // denominator); a source line is covered when any generated line
  // mapping to it executed.
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
    path,
    totalLines: total,
    coveredLines: covered,
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

// Pulls the base64 `mappings` out of an inline source map appended by
// `transpileModule` (a `//# sourceMappingURL=data:...;base64,<b64>`
// trailer).
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

// Generated (output) line numbers (0-based) that V8 marks executed.
//
// V8 emits NESTED ranges: a function's whole body is one count>0
// range, with deeper count==0 ranges carving out branches that did not
// run. So a byte's coverage is decided by the INNERMOST (smallest)
// range enclosing it — taking "any count>0 overlap" would wrongly mark
// uncovered branches as covered (and inflate the percentage toward
// 100%). We pick, per line, the smallest enclosing range and honor its
// count.
const coveredOutputLines = (
  script: V8Script,
  output: string,
): ReadonlySet<number> => {
  const ranges: ReadonlyArray<Range> =
    script.functions
      .flatMap((f) => f.ranges)
      .map((r) => ({
        start: r.startOffset,
        end: r.endOffset,
        count: r.count,
      }));
  const spans = lineSpans(output);
  const hit = new Set<number>();
  spans.forEach((span, idx) => {
    // Probe at the line's first non-space byte; find the innermost
    // range covering it; covered iff that range's count > 0.
    const probe = span.start;
    const enclosing = ranges
      .filter(
        (r) => r.start <= probe && r.end > probe,
      )
      .sort(
        (a, b) =>
          a.end - a.start - (b.end - b.start),
      );
    const innermost = enclosing[0];
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

// Byte spans of each line (0-based index) in the given text.
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
 * Applies the >90% gate (strictly greater, matching the existing rule).
 */
export const passesThreshold = (
  report: CoverageReport,
  threshold: number,
): boolean => report.pct > threshold;
