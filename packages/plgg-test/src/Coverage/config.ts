import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Result,
  ok,
  err,
  matchResult,
  Option,
  some,
  none,
  matchOption,
} from "plgg";

/**
 * Per-package coverage config. Read from
 * `<packageRoot>/plgg-test.config.json`:
 *
 *   { "coverage": { "threshold": 91, "exclude": ["/index.ts"] } }
 *   { "coverage": { "exempt": "private demo app" } }
 *
 * D14 (roadmap 2026-07-04): gating is OPT-OUT. A missing config gates at
 * {@link DEFAULT_THRESHOLD}; exemption must be an explicit, reasoned
 * marker (`coverage.exempt`). A present-but-unreadable/malformed config,
 * or an empty/non-string `exempt`, is an ERROR — never a silent skip.
 * (Before D14, during the vitest→plgg-test migration finished
 * 2026-06-24, a missing config meant UNGATED so migrated packages were
 * not silently re-gated; that safety valve is now the reversed default.)
 */
export const DEFAULT_THRESHOLD = 90;

export type CoverageGate =
  | Readonly<{
      kind: "gated";
      threshold: number;
    }>
  | Readonly<{
      kind: "exempt";
      reason: string;
    }>;

export type CoverageConfig = Readonly<{
  gate: CoverageGate;
  exclude: ReadonlyArray<string>;
}>;

const DEFAULT_EXCLUDE: ReadonlyArray<string> = [
  "/index.ts",
];

export const readConfig = (
  packageRoot: string,
): Result<CoverageConfig, string> =>
  matchResult<
    Option<unknown>,
    string,
    Result<CoverageConfig, string>
  >(
    (msg) => err(msg),
    matchOption(
      () =>
        ok<CoverageConfig>({
          gate: {
            kind: "gated",
            threshold: DEFAULT_THRESHOLD,
          },
          exclude: DEFAULT_EXCLUDE,
        }),
      (parsed: unknown) => fromParsed(parsed),
    ),
  )(
    readRaw(
      join(packageRoot, "plgg-test.config.json"),
    ),
  );

const fromParsed = (
  parsed: unknown,
): Result<CoverageConfig, string> => {
  const cov = atObj(parsed, "coverage");
  const exclude = excludeOf(cov);
  const exempt = atObj(cov, "exempt");
  if (exempt !== undefined) {
    return typeof exempt === "string" &&
      exempt.length > 0
      ? ok<CoverageConfig>({
          gate: {
            kind: "exempt",
            reason: exempt,
          },
          exclude,
        })
      : err(
          "coverage.exempt must be a non-empty string",
        );
  }
  const threshold = atObj(cov, "threshold");
  return typeof threshold === "number"
    ? ok<CoverageConfig>({
        gate: { kind: "gated", threshold },
        exclude,
      })
    : ok<CoverageConfig>({
        gate: {
          kind: "gated",
          threshold: DEFAULT_THRESHOLD,
        },
        exclude,
      });
};

const excludeOf = (
  cov: unknown,
): ReadonlyArray<string> => {
  const arr = stringArrayAt(cov, "exclude");
  return arr.length ? arr : DEFAULT_EXCLUDE;
};

// Filesystem/parse seam. `ok(none())` = file absent (→ default gate);
// `ok(some(json))` = parsed; `err` = present-but-unreadable/malformed
// (the gate must fail, never silently skip).
const readRaw = (
  file: string,
): Result<Option<unknown>, string> => {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    return isEnoent(e)
      ? ok<Option<unknown>>(none())
      : err(`config unreadable: ${file}`);
  }
  try {
    return ok<Option<unknown>>(
      some(JSON.parse(text)),
    );
  } catch {
    return err(`config not valid JSON: ${file}`);
  }
};

const isEnoent = (e: unknown): boolean =>
  typeof e === "object" &&
  e !== null &&
  "code" in e &&
  e.code === "ENOENT";

const atObj = (
  value: unknown,
  key: string,
): unknown =>
  typeof value === "object" &&
  value !== null &&
  key in value
    ? new Map(Object.entries(value)).get(key)
    : undefined;

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
