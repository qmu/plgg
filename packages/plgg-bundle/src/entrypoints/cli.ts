import { resolve, join } from "node:path";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import { type BundleConfig } from "plgg-bundle/domain/model/BundleConfig";
import { asBundleConfig } from "plgg-bundle/domain/usecase/asBundleConfig";
import { build } from "plgg-bundle/domain/usecase/build";
import { runDevServer } from "plgg-bundle/Dev/node/devServer";
import { importConfigModule } from "plgg-bundle/vendors/loadConfigModule";

/**
 * CLI entry with two modes:
 *
 *  - `plgg-bundle [config]` — the one-shot build (default):
 *    validate the config and emit the bundle.
 *  - `plgg-bundle dev [config]` — the dev server: serve the
 *    config's dev entry over node:http, watch its source,
 *    and hot-reload the browser on a code edit.
 *
 * The shell stays thin and is the single place a thrown
 * error becomes a non-zero exit — the plain-TS counterpart
 * to a `Result` edge. The `dev` server itself runs for the
 * process lifetime (it never resolves).
 */
const main = async (): Promise<void> =>
  process.argv[2] === "dev"
    ? runDev(process.argv[3])
    : runBuild(process.argv[2]);

/** The one-shot build mode. */
const runBuild = async (
  arg: string | undefined,
): Promise<void> => {
  const config = await loadConfig(arg);
  if (config === null) {
    return;
  }
  const files = build(config);
  printSizes(config, files);
};

/**
 * Print the `wrote N file(s)` line followed by one
 * per-artifact size row: raw bytes and the gzipped size
 * (`node:zlib`, already vendored — the mission measures
 * size rather than adding a minifier dependency). The
 * bundler declines a minifier, so this size accounting is
 * how a bundle's shipped weight stays visible on every
 * build and, through the release path, every publish.
 */
const printSizes = (
  config: BundleConfig,
  files: ReadonlyArray<string>,
): void => {
  const outDir = join(
    config.root,
    config.outDir,
  );
  process.stdout.write(
    `plgg-bundle: wrote ${files.length} file(s) to ${config.outDir}\n`,
  );
  let rawTotal = 0;
  let gzTotal = 0;
  for (const rel of files) {
    const bytes = readFileSync(
      join(outDir, rel),
    );
    const gz = gzipSync(bytes).byteLength;
    rawTotal += bytes.byteLength;
    gzTotal += gz;
    process.stdout.write(
      `  ${rel}  ${kib(bytes.byteLength)} (${kib(gz)} gz)\n`,
    );
  }
  if (files.length > 1) {
    process.stdout.write(
      `  total  ${kib(rawTotal)} (${kib(gzTotal)} gz)\n`,
    );
  }
};

/** A byte count as a compact `NN.N KiB`. */
const kib = (bytes: number): string =>
  `${(bytes / 1024).toFixed(1)} KiB`;

/** The dev-server mode. */
const runDev = async (
  arg: string | undefined,
): Promise<void> => {
  const config = await loadConfig(arg);
  if (config === null) {
    return;
  }
  const server = await runDevServer(config);
  process.stdout.write(
    `plgg-bundle: dev server at ${server.url}\n`,
  );
};

/**
 * Resolve, import, and validate the bundle config, or set
 * a non-zero exit and return null when it is missing.
 * Shared by both modes. The config is loaded via
 * {@link importConfigModule} — transpiled and imported as
 * a sibling `.mjs` — so Node never infers the module type
 * from the package's typeless `package.json` (no
 * `MODULE_TYPELESS_PACKAGE_JSON` warning).
 */
const loadConfig = async (
  arg: string | undefined,
): Promise<BundleConfig | null> => {
  const configPath = resolve(
    process.cwd(),
    arg ?? "bundle.config.ts",
  );
  if (!existsSync(configPath)) {
    fail(`config not found: ${configPath}`);
    return null;
  }
  const mod: unknown =
    await importConfigModule(configPath);
  return asBundleConfig(pickDefault(mod));
};

/**
 * Extract a module's `default` export as `unknown`,
 * tolerating a module that is itself the config.
 */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  "default" in mod
    ? mod.default
    : mod;

/**
 * Print an error and set a non-zero exit code.
 */
const fail = (message: string): void => {
  process.stderr.write(
    `plgg-bundle: ${message}\n`,
  );
  process.exitCode = 1;
};

// A `.catch` chain, not a top-level `await`: the self-bundle
// (the `cli` target) wraps every module body in a synchronous
// registry closure, where a module-level `await` is a syntax
// error. `main()` is the single thrown-error → non-zero-exit
// edge either way (mirrors scripts/publish.ts's bottom).
main().catch((e: unknown) => {
  fail(
    e instanceof Error ? e.message : String(e),
  );
});
