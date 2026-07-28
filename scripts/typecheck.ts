/**
 * Whole-repo typecheck gate.
 *
 * Every package's `npm run test` used to be `tsc --noEmit && plgg-test
 * src`, so the test phase paid **one cold `tsc` program per package**:
 * 50.9 s measured across 37 packages, of which ~0.8–1.5 s each is pure
 * cold-start floor — `lib.*.d.ts` and `@types/node` read, parsed and
 * bound from scratch, once per package, even for a package with a
 * single spec file.
 *
 * Tests do not need `tsc` to RUN: they execute through the runtime's
 * native type-stripping. So typecheck moves off the per-package hot loop
 * and becomes this single gate, where the expensive shared type graph is
 * paid once.
 *
 * The one thing this must NOT do is check less. The 39 packages carry 12
 * distinct tsconfig shapes — DOM vs node-only `lib`, `NodeNext` vs
 * `ESNext` module, `paths` self-aliases — so merging them into one
 * program would let a node-only package see `DOM` and silently weaken
 * its checking. Instead each package keeps its own `Program` with its
 * own options, and what is shared is the compiler HOST: one source-file
 * cache, keyed by the options that actually affect parse and bind, so
 * the big `.d.ts` files are read and parsed once for the whole repo
 * instead of 37 times.
 *
 * Usage:
 *   node scripts/typecheck.ts            # every packages/<p>/tsconfig.json
 *   node scripts/typecheck.ts plgg plgg-view   # only the named packages
 *
 * Exit code 0 iff every package is clean. Zero new dependencies: Node
 * plus the build tool's own TypeScript, the same compiler check-all
 * already runs for `scripts/`.
 */
import ts from "../packages/plgg-bundle/node_modules/typescript/lib/typescript.js";
import { existsSync, readdirSync } from "node:fs";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

/** One package's typecheck outcome. */
export type ProjectResult = Readonly<{
  name: string;
  errorCount: number;
  seconds: number;
}>;

/**
 * The packages to check: every entry that actually carries a
 * `tsconfig.json`, in stable alphabetical order. Kept pure (the
 * directory listing and the existence probe are injected) so the
 * selection rule is unit-testable without a filesystem.
 */
export const projectNames = (
  entries: ReadonlyArray<string>,
  hasConfig: (name: string) => boolean,
  requested: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  [...entries]
    .sort()
    .filter(hasConfig)
    .filter(
      (n) =>
        requested.length === 0 ||
        requested.includes(n),
    );

/**
 * The source-file cache key suffix: the compiler options that change how
 * a file PARSES or BINDS. Two packages sharing these can safely share a
 * parsed `.d.ts`; two that differ must not, which is why this is a
 * whitelist of the load-bearing options rather than the whole object —
 * `rootDir`/`outDir`/`paths` differ per package and are irrelevant to
 * the parsed form of `lib.es2021.d.ts`.
 */
export const settingsKey = (
  options: ts.CompilerOptions,
): string =>
  [
    options.target,
    options.module,
    options.moduleResolution,
    (options.lib ?? []).join(","),
    options.jsx,
    options.useDefineForClassFields,
  ].join("|");

/**
 * Where a package's incremental build info lives. Kept OUT of the
 * package (under its git-ignored `node_modules/.cache`) so a build-info
 * file can never be mistaken for source, never be published in the
 * package tarball, and never need its own `.gitignore` entry.
 */
export const buildInfoPath = (
  packagesDir: string,
  name: string,
): string =>
  join(
    packagesDir,
    name,
    "node_modules",
    ".cache",
    "typecheck.tsbuildinfo",
  );

/** The packages that reported at least one error. */
export const failedProjects = (
  results: ReadonlyArray<ProjectResult>,
): ReadonlyArray<string> =>
  results
    .filter((r) => r.errorCount > 0)
    .map((r) => r.name);

/** Non-zero iff any package reported an error. */
export const exitCodeFor = (
  results: ReadonlyArray<ProjectResult>,
): number =>
  failedProjects(results).length > 0 ? 1 : 0;

/**
 * The closing summary. A red run names every failing package on one
 * line, so the gate's output is actionable without scrolling back
 * through 37 packages of diagnostics.
 */
export const summaryOf = (
  results: ReadonlyArray<ProjectResult>,
  seconds: number,
): string => {
  const failed = failedProjects(results);
  const head = `typecheck: ${results.length} packages in ${seconds.toFixed(1)}s`;
  return failed.length === 0
    ? `${head} — all clean\n`
    : `${head} — FAILED in ${failed.length}: ${failed.join(", ")}\n`;
};

/**
 * A compiler host that consults a shared, settings-keyed cache before
 * reading and parsing a file. This is the whole point of the gate: the
 * ~10 MB of `lib.*.d.ts` and `@types/node` behind every package are
 * parsed once per distinct settings group instead of once per package.
 */
const cachingHost = (
  options: ts.CompilerOptions,
  cache: Map<string, ts.SourceFile>,
): ts.CompilerHost => {
  const host =
    ts.createIncrementalCompilerHost(options);
  const key = settingsKey(options);
  const read = host.getSourceFile.bind(host);
  host.getSourceFile = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile,
  ) => {
    const id = `${fileName}|${key}`;
    const hit = cache.get(id);
    if (hit !== undefined) {
      return hit;
    }
    const parsed = read(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    );
    if (parsed !== undefined) {
      cache.set(id, parsed);
    }
    return parsed;
  };
  return host;
};

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (f) => f,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => "\n",
};

/**
 * Typecheck one package. `noEmit` is forced so a package whose tsconfig
 * emits declarations (plgg, plggmatic, …) is checked exactly as its
 * retired `tsc --noEmit` script checked it, and nothing is written.
 */
const checkProject = (
  packagesDir: string,
  name: string,
  cache: Map<string, ts.SourceFile>,
): ProjectResult => {
  const started = Date.now();
  const configPath = join(
    packagesDir,
    name,
    "tsconfig.json",
  );
  const parsed =
    ts.getParsedCommandLineOfConfigFile(
      configPath,
      { noEmit: true },
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (
          d,
        ) =>
          process.stderr.write(
            `${name}: ${ts.formatDiagnostics([d], formatHost)}`,
          ),
      },
    );
  if (parsed === undefined) {
    process.stderr.write(
      `${name}: could not read ${configPath}\n`,
    );
    return {
      name,
      errorCount: 1,
      seconds: (Date.now() - started) / 1000,
    };
  }
  const options: ts.CompilerOptions = {
    ...parsed.options,
    incremental: true,
    tsBuildInfoFile: buildInfoPath(
      packagesDir,
      name,
    ),
  };
  const builder = ts.createIncrementalProgram({
    rootNames: parsed.fileNames,
    options,
    host: cachingHost(options, cache),
    configFileParsingDiagnostics: parsed.errors,
  });
  // Ask the BUILDER for diagnostics, never `getPreEmitDiagnostics` — the
  // latter re-checks every file from the raw program and throws away the
  // incremental cache this whole path exists to use (measured: 28.6 s →
  // 49.8 s when routed through getPreEmitDiagnostics).
  const diagnostics = [
    ...builder.getConfigFileParsingDiagnostics(),
    ...builder.getOptionsDiagnostics(),
    ...builder.getSyntacticDiagnostics(),
    ...builder.getGlobalDiagnostics(),
    ...builder.getSemanticDiagnostics(),
  ].filter(
    (d) =>
      d.category === ts.DiagnosticCategory.Error,
  );
  // Persist the build info so the NEXT run re-checks only what changed.
  // `noEmit` is forced above, so this writes the `.tsbuildinfo` and
  // nothing else.
  builder.emit();
  const seconds = (Date.now() - started) / 1000;
  if (diagnostics.length > 0) {
    process.stdout.write(
      `\n=== packages/${name} — ${diagnostics.length} error(s) ===\n` +
        ts.formatDiagnosticsWithColorAndContext(
          diagnostics,
          formatHost,
        ) +
        "\n",
    );
  }
  return {
    name,
    errorCount: diagnostics.length,
    seconds,
  };
};

const main = (): void => {
  const repoRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const packagesDir = join(repoRoot, "packages");
  const names = projectNames(
    readdirSync(packagesDir),
    (n) =>
      existsSync(
        join(packagesDir, n, "tsconfig.json"),
      ),
    process.argv.slice(2),
  );
  // One cache for the whole run — the shared type graph is the win.
  const cache = new Map<string, ts.SourceFile>();
  const started = Date.now();
  const results = names.map((n) =>
    checkProject(packagesDir, n, cache),
  );
  process.stdout.write(
    summaryOf(
      results,
      (Date.now() - started) / 1000,
    ),
  );
  process.exitCode = exitCodeFor(results);
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above (node --test loads this module and would otherwise run
// the whole repo's typecheck).
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  main();
}
