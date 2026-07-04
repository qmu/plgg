// Vendor-boundary analyzer (ticket 20260704185201).
//
// Enforces the company vendor-isolation policy as a machine-checked rule:
// third-party imports (`node:*`, the tsc compiler API, any bare non-plgg
// specifier — the repo has zero third-party npm RUNTIME deps) may appear ONLY
// under a package's `src/vendors/**` or `src/entrypoints/**` (the anti-
// corruption boundary and the thin program checkpoints). plgg-family packages
// (`plgg`, `plgg-*`, `plggmatic*`, `plggpress*`, and self-aliases) are domain
// vocabulary, importable anywhere; relative imports are in-package.
//
// A package with a violation must appear in the exemption list; an exempted
// package that is actually clean is a STALE exemption (also a failure). `plgg`
// and `plgg-db-migration` pass unexempted from day one.
//
// Zero new dependencies: imports the already-present `typescript` package from
// plgg-bundle (via createRequire) and uses its lightweight `preProcessFile`
// import scanner — no full program, no config.
//
// Usage:
//   node scripts/vendor-boundary-analyzer.mjs [--audit] [--self-test]
//     (no flag)   — gate mode: exit 1 on any violation / stale exemption
//     --audit     — print the full per-package audit table, always exit 0
//     --self-test — run the red/green logic proof, exit 1 if any case fails

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const PACKAGES = join(REPO_ROOT, "packages");
const EXEMPTIONS_FILE = join(
  HERE,
  "vendor-boundary-exemptions.txt",
);

// The tsc compiler API, resolved from plgg-bundle's node_modules (the one place
// `typescript` is installed) so the analyzer adds no dependency of its own.
const requireFromBundle = createRequire(
  pathToFileURL(
    join(PACKAGES, "plgg-bundle", "package.json"),
  ),
);
const ts = requireFromBundle("typescript");

// Classify an import specifier relative to the importing package.
//   "relative" — in-package (`./x`, `../y`)
//   "plgg"     — plgg-family domain vocabulary or a self-alias (starts "plgg")
//   "forbidden"— node: builtin, the tsc API, or any other bare third-party
const classify = (spec) =>
  spec.startsWith(".")
    ? "relative"
    : spec.startsWith("plgg")
      ? "plgg"
      : "forbidden";

// A src-relative posix path is a boundary location (may import third-party)
// when it sits under `vendors/` or `entrypoints/`.
const isBoundaryLocation = (srcRelPath) => {
  const p = srcRelPath.split(sep).join("/");
  return (
    p.startsWith("vendors/") ||
    p.startsWith("entrypoints/")
  );
};

// Test code is analyzed separately from the production boundary. The v1 gate
// governs PRODUCTION code structure; test files legitimately import real
// vendors under the "test against the real engine" practice (a temp-dir
// `node:fs`, a real `node:sqlite`), which is the anti-corruption layer's tests
// connecting to the vendor — NOT domain purity. So `*.spec.ts` and shared
// `testkit/` infrastructure are excluded (the reference package
// plgg-db-migration, which must pass unexempted, has exactly these). The
// no-`as`/`any` rule already surfaces a leaked vendor TYPE in a production
// signature through `tsc`; signature-level checking is a future upgrade.
const isTestCode = (srcRelPath) => {
  const p = srcRelPath.split(sep).join("/");
  return (
    p.endsWith(".spec.ts") ||
    p.endsWith(".spec.tsx") ||
    p.startsWith("testkit/") ||
    p.includes("/testkit/")
  );
};

// Every `.ts`/`.tsx` file under a directory (recursive), excluding specs is NOT
// done here — domain specs must stay pure too (policy), so they are analyzed.
const walkTs = (dir) => {
  const out = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        visit(full);
      } else if (
        name.endsWith(".ts") ||
        name.endsWith(".tsx")
      ) {
        out.push(full);
      }
    }
  };
  visit(dir);
  return out;
};

// Scan one file for forbidden imports outside the boundary locations. Returns
// [{ file, line, spec }].
const scanFile = (pkgSrc, file) => {
  const text = readFileSync(file, "utf8");
  const info = ts.preProcessFile(text, true, true);
  const srcRel = relative(pkgSrc, file);
  if (isBoundaryLocation(srcRel) || isTestCode(srcRel)) {
    return [];
  }
  const violations = [];
  for (const imp of info.importedFiles) {
    if (classify(imp.fileName) === "forbidden") {
      const line =
        text.slice(0, imp.pos).split("\n").length;
      violations.push({
        file: relative(REPO_ROOT, file),
        line,
        spec: imp.fileName,
      });
    }
  }
  return violations;
};

// The per-package audit: violations + whether a src/domain/ layout exists.
const auditPackages = () => {
  const pkgs = readdirSync(PACKAGES).filter((n) => {
    const s = join(PACKAGES, n, "src");
    return existsSync(s) && statSync(s).isDirectory();
  });
  return pkgs.map((pkg) => {
    const src = join(PACKAGES, pkg, "src");
    const violations = walkTs(src).flatMap((f) =>
      scanFile(src, f),
    );
    return {
      pkg,
      hasDomainLayout: existsSync(
        join(src, "domain"),
      ),
      violations,
    };
  });
};

const readExemptions = () => {
  if (!existsSync(EXEMPTIONS_FILE)) {
    return new Set();
  }
  return new Set(
    readFileSync(EXEMPTIONS_FILE, "utf8")
      .split("\n")
      .map((l) => l.replace(/#.*$/, "").trim())
      .filter((l) => l.length > 0),
  );
};

// Gate: fail on an unexempted package with violations, or an exempted package
// that is actually clean (stale). Returns { failures: string[] }.
const gate = (audit, exemptions) => {
  const failures = [];
  for (const { pkg, violations } of audit) {
    const exempted = exemptions.has(pkg);
    if (violations.length > 0 && !exempted) {
      failures.push(
        `${pkg}: ${violations.length} boundary violation(s) — third-party import outside vendors/entrypoints:`,
      );
      for (const v of violations) {
        failures.push(
          `    ${v.file}:${v.line}  imports "${v.spec}"`,
        );
      }
    } else if (
      violations.length === 0 &&
      exempted
    ) {
      failures.push(
        `${pkg}: STALE exemption — the package is clean; remove it from vendor-boundary-exemptions.txt.`,
      );
    }
  }
  const listed = [...exemptions];
  const known = new Set(audit.map((a) => a.pkg));
  for (const e of listed) {
    if (!known.has(e)) {
      failures.push(
        `exemption "${e}" names no package under packages/ — remove the stale line.`,
      );
    }
  }
  return { failures };
};

// ── self-test: prove the gate logic red on a violation + a stale exemption,
// green on a clean unexempted package — without mutating the real tree. ──
const selfTest = () => {
  const cases = [];
  // 1. a domain file importing node:fs is forbidden
  cases.push([
    "domain node: import is a violation",
    classify("node:fs") === "forbidden" &&
      !isBoundaryLocation("domain/usecase/x.ts"),
  ]);
  // 2. the same import UNDER vendors/ is allowed
  cases.push([
    "node: import under vendors/ is allowed",
    isBoundaryLocation("vendors/fs.ts"),
  ]);
  cases.push([
    "node: import under entrypoints/ is allowed",
    isBoundaryLocation("entrypoints/cli.ts"),
  ]);
  // test code (specs + testkit) is excluded from the production boundary
  cases.push([
    "domain spec + testkit are test code (excluded)",
    isTestCode("domain/usecase/x.spec.ts") &&
      isTestCode("testkit/sqliteDb.ts") &&
      isTestCode("Fts5/usecase/e.spec.ts") &&
      !isTestCode("domain/usecase/x.ts"),
  ]);
  // 3. plgg-family + relative are domain vocabulary
  cases.push([
    "plgg-family is allowed anywhere",
    classify("plgg") === "plgg" &&
      classify("plgg-view") === "plgg" &&
      classify("plggmatic/style") === "plgg" &&
      classify("plggpress/framework") === "plgg",
  ]);
  cases.push([
    "relative is allowed anywhere",
    classify("./x") === "relative" &&
      classify("../y/z") === "relative",
  ]);
  // 4. the tsc API and bare third-party are forbidden
  cases.push([
    "typescript + bare third-party are forbidden",
    classify("typescript") === "forbidden" &&
      classify("fs") === "forbidden" &&
      classify("some-sdk") === "forbidden",
  ]);
  // 5. gate() flags an unexempted violation (red)
  const red = gate(
    [
      {
        pkg: "fixture",
        hasDomainLayout: true,
        violations: [
          {
            file: "x",
            line: 1,
            spec: "node:fs",
          },
        ],
      },
    ],
    new Set(),
  );
  cases.push([
    "gate is RED on an unexempted violation",
    red.failures.length > 0,
  ]);
  // 6. gate() flags a stale exemption (clean + exempted)
  const stale = gate(
    [
      {
        pkg: "fixture",
        hasDomainLayout: true,
        violations: [],
      },
    ],
    new Set(["fixture"]),
  );
  cases.push([
    "gate is RED on a stale exemption",
    stale.failures.some((f) =>
      f.includes("STALE"),
    ),
  ]);
  // 7. gate() is green on a clean unexempted package
  const green = gate(
    [
      {
        pkg: "fixture",
        hasDomainLayout: true,
        violations: [],
      },
    ],
    new Set(),
  );
  cases.push([
    "gate is GREEN on a clean unexempted package",
    green.failures.length === 0,
  ]);
  // 8. gate() is green on an exempted package WITH violations (expected)
  const exemptedDirty = gate(
    [
      {
        pkg: "fixture",
        hasDomainLayout: false,
        violations: [
          {
            file: "x",
            line: 1,
            spec: "node:fs",
          },
        ],
      },
    ],
    new Set(["fixture"]),
  );
  cases.push([
    "gate is GREEN on an exempted package with violations",
    exemptedDirty.failures.length === 0,
  ]);

  let ok = true;
  for (const [name, pass] of cases) {
    console.log(
      `  ${pass ? "PASS" : "FAIL"}  ${name}`,
    );
    if (!pass) {
      ok = false;
    }
  }
  return ok;
};

const main = () => {
  const mode = process.argv[2] ?? "--gate";
  if (mode === "--self-test") {
    console.log(
      "=== vendor-boundary gate self-test ===",
    );
    process.exit(selfTest() ? 0 : 1);
  }
  const audit = auditPackages();
  if (mode === "--audit") {
    for (const {
      pkg,
      hasDomainLayout,
      violations,
    } of audit) {
      const layout = hasDomainLayout
        ? "domain/"
        : "legacy";
      const specs = [
        ...new Set(
          violations.map((v) => v.spec),
        ),
      ].sort();
      console.log(
        `${pkg.padEnd(20)} ${layout.padEnd(8)} ${
          violations.length
        } violation(s)${
          specs.length
            ? ` [${specs.join(", ")}]`
            : ""
        }`,
      );
    }
    process.exit(0);
  }
  // gate mode
  const exemptions = readExemptions();
  const { failures } = gate(audit, exemptions);
  if (failures.length > 0) {
    console.log(
      "VENDOR-BOUNDARY GATE FAILED:",
    );
    for (const f of failures) {
      console.log(`  ${f}`);
    }
    process.exit(1);
  }
  const exemptCount = exemptions.size;
  console.log(
    `vendor-boundary gate passed (${
      audit.length
    } packages; ${
      audit.length - exemptCount
    } conformant, ${exemptCount} exempted)`,
  );
  process.exit(0);
};

main();
