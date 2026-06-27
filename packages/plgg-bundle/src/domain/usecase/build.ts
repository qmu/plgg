import {
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import {
  type BundleConfig,
  type Entry,
  applyFileName,
} from "plgg-bundle/domain/model/BundleConfig";
import {
  collectModules,
  type Graph,
} from "plgg-bundle/domain/usecase/collectModules";
import {
  emitCjsBundle,
  emitEsmBundle,
} from "plgg-bundle/domain/usecase/emitBundle";
import { emitDts } from "plgg-bundle/domain/usecase/emitDts";
import { deriveExternal } from "plgg-bundle/domain/usecase/deriveExternal";
import { readExportNames } from "plgg-bundle/vendors/runner";

/**
 * Build one package's `dist` from its
 * {@link BundleConfig}: for every entry × format emit
 * the dual JS bundle (in-house registry), then the
 * per-file `.d.ts` tree (via tsc). Returns the relative
 * paths written. Throws on the first failure (caught at
 * the bin boundary). Fully synchronous.
 *
 * Order per entry: CJS first (self-contained, runnable),
 * execute it to read the exact export-name set, then ESM
 * with those static named exports. Declarations run once
 * for the package.
 */
export const build = (
  config: BundleConfig,
): ReadonlyArray<string> => {
  const outDir = join(config.root, config.outDir);
  // Build into a PRIVATE staging dir, then swap it into
  // place as the final step (see swapIntoPlace). The live
  // `dist` must never be observed half-built: it is read
  // concurrently — by a downstream package's `tsc`/runner
  // resolving this package as a dependency, and by any
  // overlapping build invocation. The old emptyDir-on-live
  // pattern left a multi-second window where `dist` was
  // missing or partial; a reader hitting it resolved the
  // dependency to its `.js` (TS7016 implicit-any), to a
  // not-yet-complete barrel (TS2305 "no exported member"),
  // or found no `index.cjs.js` at all — the
  // non-deterministic dts-emit flake. Staging shrinks that
  // window from the whole build to a single rename.
  const stageDir = `${outDir}.stage`;
  emptyDir(stageDir);
  // Externals come from the package's declared dependency
  // graph (+ node:*), not the config — so a bundle stays
  // faithful to what its package.json says it depends on,
  // and an undeclared import fails loudly (ruling B).
  const external = deriveExternal(config.root);
  const written: string[] = [];
  for (const entry of config.entries) {
    const graph = collectModules({
      entryFile: join(
        config.root,
        config.rootDir,
        entry.input,
      ),
      root: config.root,
      aliasPrefix: config.alias.prefix,
      aliasSrcRoot: join(
        config.root,
        config.alias.srcRoot,
      ),
      external,
    });
    written.push(
      ...buildEntry(
        config,
        entry,
        graph,
        stageDir,
      ),
    );
  }
  emitDts({
    root: config.root,
    rootDir: config.rootDir,
    outDir: stageDir,
    aliasPrefix: config.alias.prefix,
  });
  swapIntoPlace(stageDir, outDir);
  return written;
};

/**
 * Replace `outDir` with the freshly-built `stageDir` in a
 * single rename, so a concurrent reader sees only a
 * complete `dist` (old or new) — never a torn one. The
 * destructive window is one `rename`, not the whole build.
 */
const swapIntoPlace = (
  stageDir: string,
  outDir: string,
): void => {
  const backup = `${outDir}.old`;
  rmSync(backup, {
    recursive: true,
    force: true,
  });
  if (existsSync(outDir)) {
    renameSync(outDir, backup);
  }
  renameSync(stageDir, outDir);
  rmSync(backup, {
    recursive: true,
    force: true,
  });
};

/**
 * Build every configured format for one entry, returning
 * the relative paths written.
 */
const buildEntry = (
  config: BundleConfig,
  entry: Entry,
  graph: Graph,
  destDir: string,
): ReadonlyArray<string> => {
  const cjs = emitCjsBundle(graph);
  // Discover the exact export surface by running the CJS
  // bundle and reading its keys — ESM cannot declare
  // exports dynamically. The bundle's external requires
  // resolve against the target package's node_modules.
  const esm = emitEsmBundle(
    graph,
    readExportNames(cjs, config.root),
  );
  const written: string[] = [];
  for (const format of config.formats) {
    const code = format === "es" ? esm : cjs;
    const rel = applyFileName(
      config.fileNamePattern,
      entry.name,
      format,
    );
    writeOut(join(destDir, rel), code);
    written.push(rel);
  }
  return written;
};

/**
 * Empty (and recreate) the output directory. The
 * recursive remove is the bundler's own build output —
 * `force` tolerates a not-yet-existing dir.
 */
const emptyDir = (dir: string): void => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
};

/**
 * Write a file, creating parent dirs; re-throws with
 * context on failure.
 */
const writeOut = (
  path: string,
  code: string,
): void => {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, code, "utf8");
  } catch (cause) {
    throw new Error(
      `IoError: cannot write ${path}: ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
    );
  }
};
