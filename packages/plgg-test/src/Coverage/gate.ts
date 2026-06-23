import {
  collect,
  passesThreshold,
} from "plgg-test/Coverage/v8";

/**
 * Coverage gate entry, invoked by the bin launcher as the parent
 * post-pass: `node … gate.ts <covDir> <srcRoot>`. Reads the dumped V8
 * coverage, folds it (Coverage/v8.ts), prints per-file + total line
 * coverage, and exits non-zero when the total is not strictly greater
 * than the threshold (the existing >90% rule; default 90).
 *
 * The exclude list mirrors the existing vite config: index barrels,
 * abstract/HKT seams, and the grandfathered escape-hatch files that
 * are not meant to be covered.
 */
const EXCLUDE: ReadonlyArray<string> = [
  "/index.ts",
  "/Abstracts/",
  "/Grammaticals/Brand.ts",
  "/Grammaticals/NonNeverFn.ts",
  "/Grammaticals/PromisedResult.ts",
];

const THRESHOLD = 90;

const main = (): void => {
  const covDir = process.argv[2];
  const srcRoot = process.argv[3];
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
  const rep = collect(
    covDir,
    srcRoot,
    EXCLUDE,
  );
  rep.files.forEach((f) =>
    process.stdout.write(
      `${f.pct.toFixed(2).padStart(6)}%  ${f.path}\n`,
    ),
  );
  process.stdout.write(
    `\nTotal line coverage: ${rep.pct.toFixed(2)}% (${rep.coveredLines}/${rep.totalLines})\n`,
  );
  const ok = passesThreshold(
    rep,
    THRESHOLD,
  );
  process.stdout.write(
    ok
      ? `Coverage gate passed (> ${THRESHOLD}%)\n`
      : `Coverage gate FAILED (need > ${THRESHOLD}%)\n`,
  );
  process.exitCode = ok ? 0 : 1;
};

main();
