#!/usr/bin/env node
// Parity gate (Plan Amendment 3): proves plgg-test is a safe drop-in
// for vitest on the REAL corpus BEFORE vitest is removed. It runs both
// runners on a package and asserts:
//   (a) the SAME set of discovered spec files (closes the
//       partial-discovery false green), and
//   (b) identical per-test pass/fail verdicts.
//
// Usage:
//   node parity-gate.mjs <packageDir>                 (run vitest live)
//   node parity-gate.mjs <packageDir> <baseline.json> (use a SAVED
//        vitest --reporter=json baseline — required once specs have
//        been migrated to `from "plgg-test"`, since vitest can no
//        longer resolve them. Capture the baseline BEFORE the codemod:
//        `npx vitest --run --reporter=json --outputFile=baseline.json`)
// Exits 0 only on full file-set + verdict parity.
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = resolve(process.argv[2] ?? ".");
const here = dirname(
  fileURLToPath(import.meta.url),
);

// --- vitest baseline -------------------------------------------------
const savedBaseline = process.argv[3];
let tmpBaselineDir = "";
const vitestReport = (() => {
  if (savedBaseline) {
    return JSON.parse(
      readFileSync(
        resolve(savedBaseline),
        "utf8",
      ),
    );
  }
  tmpBaselineDir = mkdtempSync(
    join(tmpdir(), "parity-vitest-"),
  );
  const vitestOut = join(
    tmpBaselineDir,
    "report.json",
  );
  spawnSync(
    "npx",
    [
      "vitest",
      "--run",
      "--reporter=json",
      `--outputFile=${vitestOut}`,
    ],
    { cwd: pkgDir, encoding: "utf8" },
  );
  return JSON.parse(
    readFileSync(vitestOut, "utf8"),
  );
})();
const vitestFiles = new Set(
  vitestReport.testResults.map((t) => t.name),
);

// --- plgg-test run ---------------------------------------------------
const pt = spawnSync(
  "node",
  [join(here, "plgg-test.mjs"), "src"],
  {
    cwd: pkgDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PLGG_TEST_PRINT_FILES: "1",
    },
  },
);
const ptLines = (pt.stdout ?? "")
  .split("\n")
  .filter((l) => l.startsWith("FILE "))
  .map((l) => l.slice(5).trim());
const ptFiles = new Set(ptLines);

// --- compare file sets ----------------------------------------------
const onlyVitest = [...vitestFiles].filter(
  (f) => !ptFiles.has(f),
);
const onlyPt = [...ptFiles].filter(
  (f) => !vitestFiles.has(f),
);

// --- compare verdicts (totals, since plgg-test prints a summary) ----
const ptSummary = (pt.stdout ?? "").match(
  /(\d+) passed, (\d+) failed/,
);
const ptPassed = ptSummary
  ? Number(ptSummary[1])
  : -1;
const ptFailed = ptSummary
  ? Number(ptSummary[2])
  : -1;

const vitestPassed = vitestReport.numPassedTests;
const vitestFailed = vitestReport.numFailedTests;

console.log("=== Parity Gate ===");
console.log(
  `vitest:    ${vitestFiles.size} files, ${vitestPassed} passed, ${vitestFailed} failed`,
);
console.log(
  `plgg-test: ${ptFiles.size} files, ${ptPassed} passed, ${ptFailed} failed`,
);

const fileSetOk =
  onlyVitest.length === 0 && onlyPt.length === 0;
if (!fileSetOk) {
  console.log("FILE SET MISMATCH:");
  onlyVitest.forEach((f) =>
    console.log(`  only vitest: ${f}`),
  );
  onlyPt.forEach((f) =>
    console.log(`  only plgg-test: ${f}`),
  );
}

const verdictOk =
  ptPassed === vitestPassed &&
  ptFailed === vitestFailed &&
  vitestFailed === 0;

if (tmpBaselineDir) {
  rmSync(tmpBaselineDir, {
    recursive: true,
    force: true,
  });
}

if (fileSetOk && verdictOk) {
  console.log(
    "PARITY OK: identical file set and all-pass verdict parity.",
  );
  process.exit(0);
}
console.log("PARITY FAILED.");
process.exit(1);
