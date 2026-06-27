import {
  writeFileSync,
  mkdirSync,
  rmSync,
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
  // Empty the output dir first (vite's emptyOutDir):
  // stale `.d.ts` left in `dist` are otherwise read by
  // the declaration-emit `tsc` as inputs and collide
  // (TS5055), and a clean dir makes the produced tree
  // an exact reproduction.
  emptyDir(outDir);
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
      external: config.external,
    });
    written.push(
      ...buildEntry(config, entry, graph),
    );
  }
  emitDts({
    root: config.root,
    rootDir: config.rootDir,
    outDir,
    aliasPrefix: config.alias.prefix,
  });
  return written;
};

/**
 * Build every configured format for one entry, returning
 * the relative paths written.
 */
const buildEntry = (
  config: BundleConfig,
  entry: Entry,
  graph: Graph,
): ReadonlyArray<string> => {
  const cjs = emitCjsBundle(graph);
  // Discover the exact export surface by running the
  // self-contained CJS bundle and reading its keys —
  // ESM cannot declare exports dynamically.
  const esm = emitEsmBundle(
    graph,
    readExportNames(cjs),
  );
  const written: string[] = [];
  for (const format of config.formats) {
    const code = format === "es" ? esm : cjs;
    const rel = applyFileName(
      config.fileNamePattern,
      entry.name,
      format,
    );
    writeOut(
      join(config.root, config.outDir, rel),
      code,
    );
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
