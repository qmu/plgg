import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "../index.js";
import {
  formatReport,
  gateOutcome,
  foldAndGate,
} from "./report.js";
import type { CoverageReport } from "./v8.js";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const metric = (
  covered: number,
  total: number,
) => ({
  covered,
  total,
  pct: total === 0 ? 100 : (covered / total) * 100,
});

const reportOf = (
  covered: number,
  total: number,
): CoverageReport => ({
  files: [
    {
      path: "/pkg/src/a.ts",
      statements: metric(covered, total),
      branches: metric(covered, total),
      functions: metric(covered, total),
      lines: metric(covered, total),
    },
  ],
  statements: metric(covered, total),
  branches: metric(covered, total),
  functions: metric(covered, total),
  lines: metric(covered, total),
});

const withDir = <T>(
  fn: (dir: string) => T,
): T => {
  const dir = mkdtempSync(
    join(tmpdir(), "plgg-rep-"),
  );
  try {
    return fn(dir);
  } finally {
    rmSync(dir, {
      recursive: true,
      force: true,
    });
  }
};

test("formatReport: per-file line then the four totals", () => {
  const text = formatReport(reportOf(95, 100));
  return all([
    check(text, toContain("/pkg/src/a.ts")),
    check(
      text,
      toContain("Statements :  95.00% (95/100)"),
    ),
    check(
      text,
      toContain("Branches   :  95.00% (95/100)"),
    ),
    check(
      text,
      toContain("Functions  :  95.00% (95/100)"),
    ),
    check(
      text,
      toContain("Lines      :  95.00% (95/100)"),
    ),
  ]);
});

test("gateOutcome: above the threshold passes", () => {
  const out = gateOutcome(reportOf(95, 100), {
    kind: "gated",
    threshold: 90,
  });
  return all([
    check(out.exitCode, toBe(0)),
    check(out.line, toContain("passed")),
  ]);
});

test("gateOutcome: below the threshold fails with a non-zero code", () => {
  const out = gateOutcome(reportOf(80, 100), {
    kind: "gated",
    threshold: 90,
  });
  return all([
    check(out.exitCode, toBe(1)),
    check(out.line, toContain("FAILED")),
  ]);
});

test("gateOutcome: the threshold is strict — equal does not pass", () => {
  const out = gateOutcome(reportOf(90, 100), {
    kind: "gated",
    threshold: 90,
  });
  return check(out.exitCode, toBe(1));
});

test("gateOutcome: an exempt package reports without gating", () => {
  const out = gateOutcome(reportOf(10, 100), {
    kind: "exempt",
    reason: "private demo app",
  });
  return all([
    check(out.exitCode, toBe(0)),
    check(out.line, toContain("EXEMPT")),
    check(
      out.line,
      toContain("private demo app"),
    ),
  ]);
});

test("foldAndGate: an empty dump gates green and prints the totals", () =>
  withDir((dir) => {
    const written: Array<string> = [];
    const code = foldAndGate(
      dir,
      join(dir, "src"),
      dir,
      (s) => written.push(s),
    );
    return all([
      check(code, toBe(0)),
      check(
        written.join(""),
        toContain("Coverage gate passed"),
      ),
    ]);
  }));

test("foldAndGate: a malformed config is an error, never a silent skip", () =>
  withDir((dir) => {
    writeFileSync(
      join(dir, "plgg-test.config.json"),
      "{ not json",
    );
    const written: Array<string> = [];
    const code = foldAndGate(
      dir,
      join(dir, "src"),
      dir,
      (s) => written.push(s),
    );
    return all([
      check(code, toBe(1)),
      check(
        written.join(""),
        toContain("coverage gate:"),
      ),
    ]);
  }));

test("foldAndGate: an exempt package is reported, not gated", () =>
  withDir((dir) => {
    writeFileSync(
      join(dir, "plgg-test.config.json"),
      JSON.stringify({
        coverage: { exempt: "demo only" },
      }),
    );
    const written: Array<string> = [];
    const code = foldAndGate(
      dir,
      join(dir, "src"),
      dir,
      (s) => written.push(s),
    );
    return all([
      check(code, toBe(0)),
      check(
        written.join(""),
        toContain("EXEMPT (demo only)"),
      ),
    ]);
  }));
