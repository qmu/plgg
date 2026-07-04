import {
  collect,
  passesThreshold,
} from "./v8.js";
import { readConfig } from "./config.js";
import { matchResult } from "plgg";
import type { Metric } from "./v8.js";
import type { CoverageConfig } from "./config.js";

/**
 * Coverage gate entry, invoked by the bin launcher as the parent
 * post-pass: `node … gate.ts <covDir> <srcRoot> <packageRoot>`.
 *
 * Reads the dumped V8 coverage, folds it into FOUR metrics
 * (statements/branches/functions/lines), prints per-file lines + the
 * totals, and gates against the PER-PACKAGE config from
 * `<packageRoot>/plgg-test.config.json`. Per D14 gating is opt-out: a
 * missing config gates at the default threshold; an explicit `exempt`
 * marker reports without gating; an unreadable/malformed config fails.
 */
const main = (): void => {
  const covDir = process.argv[2];
  const srcRoot = process.argv[3];
  const packageRoot =
    process.argv[4] ?? process.cwd();
  if (
    covDir === undefined ||
    srcRoot === undefined
  ) {
    process.stdout.write(
      "coverage gate: missing covDir/srcRoot\n",
    );
    process.exitCode = 1;
    return;
  }
  matchResult<CoverageConfig, string, void>(
    (msg) => {
      process.stdout.write(
        `coverage gate: ${msg}\n`,
      );
      process.exitCode = 1;
    },
    (config) =>
      runGate(covDir, srcRoot, config),
  )(readConfig(packageRoot));
};

const runGate = (
  covDir: string,
  srcRoot: string,
  config: CoverageConfig,
): void => {
  const rep = collect(
    covDir,
    srcRoot,
    config.exclude,
  );
  rep.files.forEach((f) =>
    process.stdout.write(
      `${pct(f.lines)}  ${f.path}\n`,
    ),
  );
  process.stdout.write(
    "\n" +
      metricLine("Statements", rep.statements) +
      metricLine("Branches", rep.branches) +
      metricLine("Functions", rep.functions) +
      metricLine("Lines", rep.lines),
  );
  const gate = config.gate;
  switch (gate.kind) {
    case "exempt":
      process.stdout.write(
        `Coverage: reported only — EXEMPT (${gate.reason})\n`,
      );
      process.exitCode = 0;
      return;
    case "gated": {
      const ok = passesThreshold(
        rep,
        gate.threshold,
      );
      process.stdout.write(
        ok
          ? `Coverage gate passed (all four metrics > ${gate.threshold}%)\n`
          : `Coverage gate FAILED (need all four > ${gate.threshold}%)\n`,
      );
      process.exitCode = ok ? 0 : 1;
      return;
    }
    default: {
      const unreachable: never = gate;
      return unreachable;
    }
  }
};

const pct = (m: Metric): string =>
  `${m.pct.toFixed(2).padStart(6)}%`;

const metricLine = (
  label: string,
  m: Metric,
): string =>
  `${label.padEnd(11)}: ${m.pct.toFixed(2).padStart(6)}% (${m.covered}/${m.total})\n`;

main();
