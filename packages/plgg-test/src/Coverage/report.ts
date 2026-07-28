import { matchResult } from "plgg";
import {
  collect,
  passesThreshold,
} from "./v8.js";
import { readConfig } from "./config.js";
import type { Metric, CoverageReport } from "./v8.js";
import type {
  CoverageConfig,
  CoverageGate,
} from "./config.js";

/**
 * Folding the dumped V8 coverage into the four-metric report, and
 * applying the per-package threshold.
 *
 * This used to live entirely in `gate.ts`, which the bin launcher
 * spawned as a THIRD process after every run — on top of the
 * coverage-instrumented run and the `tsc` program. That third cold node
 * start cost ~0.7 s per package (~27 s across the repo) to do work the
 * process that produced the coverage could do itself, so the logic moved
 * here and both callers share it: `gate.ts` (still a standalone entry)
 * and the CLI, which now folds in-process.
 *
 * One implementation, two callers — the threshold rule must never exist
 * in two places.
 */

const pct = (m: Metric): string =>
  `${m.pct.toFixed(2).padStart(6)}%`;

const metricLine = (
  label: string,
  m: Metric,
): string =>
  `${label.padEnd(11)}: ${m.pct.toFixed(2).padStart(6)}% (${m.covered}/${m.total})\n`;

/**
 * The per-file lines plus the four totals. Pure, so the report's shape
 * is pinned by a spec rather than by reading a run's output.
 */
export const formatReport = (
  rep: CoverageReport,
): string =>
  rep.files
    .map((f) => `${pct(f.lines)}  ${f.path}\n`)
    .join("") +
  "\n" +
  metricLine("Statements", rep.statements) +
  metricLine("Branches", rep.branches) +
  metricLine("Functions", rep.functions) +
  metricLine("Lines", rep.lines);

/** A gate verdict: the line to print and the exit code it implies. */
export type GateOutcome = Readonly<{
  line: string;
  exitCode: number;
}>;

/**
 * Applies one package's gate to a folded report. Exempt reports but does
 * not gate; gated requires all four metrics strictly above the
 * threshold. Pure — the decision is the thing worth testing.
 */
export const gateOutcome = (
  rep: CoverageReport,
  gate: CoverageGate,
): GateOutcome => {
  switch (gate.kind) {
    case "exempt":
      return {
        line: `Coverage: reported only — EXEMPT (${gate.reason})\n`,
        exitCode: 0,
      };
    case "gated": {
      const ok = passesThreshold(
        rep,
        gate.threshold,
      );
      return {
        line: ok
          ? `Coverage gate passed (all four metrics > ${gate.threshold}%)\n`
          : `Coverage gate FAILED (need all four > ${gate.threshold}%)\n`,
        exitCode: ok ? 0 : 1,
      };
    }
    default: {
      const unreachable: never = gate;
      return unreachable;
    }
  }
};

const runGate = (
  covDir: string,
  srcRoot: string,
  config: CoverageConfig,
  write: (s: string) => void,
): number => {
  const rep = collect(
    covDir,
    srcRoot,
    config.exclude,
  );
  const outcome = gateOutcome(rep, config.gate);
  write(formatReport(rep) + outcome.line);
  return outcome.exitCode;
};

/**
 * Read the package's config, fold the dump, print, and return the exit
 * code. The one effectful seam both callers share; a missing/malformed
 * config is an error, never a silent skip (D14).
 */
export const foldAndGate = (
  covDir: string,
  srcRoot: string,
  packageRoot: string,
  write: (s: string) => void,
): number =>
  matchResult<CoverageConfig, string, number>(
    (msg) => {
      write(`coverage gate: ${msg}\n`);
      return 1;
    },
    (config) =>
      runGate(covDir, srcRoot, config, write),
  )(readConfig(packageRoot));
