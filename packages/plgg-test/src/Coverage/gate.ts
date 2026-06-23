import {
  collect,
  passesThreshold,
} from "plgg-test/Coverage/v8";
import { readConfig } from "plgg-test/Coverage/config";
import { matchOption } from "plgg";
import type { Metric } from "plgg-test/Coverage/v8";

/**
 * Coverage gate entry, invoked by the bin launcher as the parent
 * post-pass: `node … gate.ts <covDir> <srcRoot> <packageRoot>`.
 *
 * Reads the dumped V8 coverage, folds it into FOUR metrics
 * (statements/branches/functions/lines — Iteration-1 parity with the
 * vitest config it replaces), prints per-file lines + the totals, and
 * gates against the PER-PACKAGE threshold from
 * `<packageRoot>/plgg-test.config.json`. A package with no threshold is
 * reported but not gated (the formerly-ungated packages).
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
  const config = readConfig(packageRoot);
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
  matchOption(
    () => {
      process.stdout.write(
        "Coverage: reported (this package is UNGATED — no threshold configured)\n",
      );
      process.exitCode = 0;
    },
    (threshold: number) => {
      const ok = passesThreshold(rep, threshold);
      process.stdout.write(
        ok
          ? `Coverage gate passed (all four metrics > ${threshold}%)\n`
          : `Coverage gate FAILED (need all four > ${threshold}%)\n`,
      );
      process.exitCode = ok ? 0 : 1;
    },
  )(config.threshold);
};

const pct = (m: Metric): string =>
  `${m.pct.toFixed(2).padStart(6)}%`;

const metricLine = (
  label: string,
  m: Metric,
): string =>
  `${label.padEnd(11)}: ${m.pct.toFixed(2).padStart(6)}% (${m.covered}/${m.total})\n`;

main();
