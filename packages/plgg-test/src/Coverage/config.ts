import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Option, some, none } from "plgg";

/**
 * Per-package coverage config (Iteration-1: thresholds are
 * per-package, not a hardcoded 90). Read from
 * `<packageRoot>/plgg-test.config.json`:
 *
 *   { "coverage": { "threshold": 91, "exclude": ["/index.ts", …] } }
 *
 * A MISSING config, or a config with no numeric `threshold`, means the
 * package is UNGATED (coverage is reported but never fails the run) —
 * exactly the three packages that today carry `coverage: { all: true }`
 * with no thresholds. This keeps migrating more packages later from
 * silently re-gating them at some default.
 */
export type CoverageConfig = Readonly<{
  threshold: Option<number>;
  exclude: ReadonlyArray<string>;
}>;

const DEFAULT_EXCLUDE: ReadonlyArray<string> = [
  "/index.ts",
  "/Abstracts/",
  "/Grammaticals/Brand.ts",
  "/Grammaticals/NonNeverFn.ts",
  "/Grammaticals/PromisedResult.ts",
];

export const readConfig = (
  packageRoot: string,
): CoverageConfig => {
  const parsed = readJson(
    join(packageRoot, "plgg-test.config.json"),
  );
  const cov = atObj(parsed, "coverage");
  return {
    threshold: numberAt(cov, "threshold"),
    exclude: stringArrayAt(cov, "exclude").length
      ? stringArrayAt(cov, "exclude")
      : DEFAULT_EXCLUDE,
  };
};

const readJson = (file: string): unknown => {
  // Filesystem/parse seam: a missing or malformed config means
  // "ungated, default excludes" rather than a crash.
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
};

const atObj = (
  value: unknown,
  key: string,
): unknown =>
  typeof value === "object" &&
  value !== null &&
  key in value
    ? new Map(Object.entries(value)).get(key)
    : undefined;

const numberAt = (
  value: unknown,
  key: string,
): Option<number> => {
  const v = atObj(value, key);
  return typeof v === "number" ? some(v) : none();
};

const stringArrayAt = (
  value: unknown,
  key: string,
): ReadonlyArray<string> => {
  const v = atObj(value, key);
  return Array.isArray(v)
    ? v.filter(
        (e): e is string => typeof e === "string",
      )
    : [];
};
