import { foldAndGate } from "./report.js";

/**
 * Standalone coverage-gate entry: `node … gate.ts <covDir> <srcRoot>
 * <packageRoot>`.
 *
 * The launcher no longer spawns this — the CLI folds coverage
 * in-process now, which is what removed the third cold node start per
 * package. The entry is kept because folding a coverage dump a run
 * already produced is a genuinely useful standalone operation, and
 * because the fold and the gate live in `report.js`, shared by both
 * callers rather than duplicated here.
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
  process.exitCode = foldAndGate(
    covDir,
    srcRoot,
    packageRoot,
    (s) => process.stdout.write(s),
  );
};

main();
