import {
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  existsSync,
} from "plgg-bundle/vendors/nodeFs";
import { join, dirname } from "plgg-bundle/vendors/nodePath";
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
import { deriveExportNames } from "plgg-bundle/vendors/exportSurface";
import { discoverWorkspace } from "plgg-bundle/domain/usecase/discoverWorkspace";
import { resolveWorkspaceSpecifier } from "plgg-bundle/domain/usecase/resolveWorkspaceSpecifier";

/**
 * Build one package's `dist` from its
 * {@link BundleConfig}. Dispatches on the config
 * `target`: a `"library"` (dual `es`/`cjs` per entry +
 * per-file `.d.ts`, deps external) or the `"app"` leaf (a
 * single self-contained `es` bundle, siblings inlined, no
 * `.d.ts`). Both build into a private staging dir and
 * publish with one atomic swap. Returns the relative
 * paths written. Throws on the first failure (caught at
 * the bin boundary). Fully synchronous.
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
  const written =
    config.target === "app"
      ? buildApp(config, stageDir)
      : buildLibrary(config, stageDir);
  swapIntoPlace(stageDir, outDir);
  return written;
};

/**
 * Library build: per entry, emit the dual `es`/`cjs`
 * bundle (CJS first so its runtime keys give ESM its
 * export surface), then the per-file `.d.ts` tree once.
 * Deps are external (ruling B), derived from the
 * package's declared dependency graph (+ `node:*`) so a
 * bundle stays faithful to its manifest and an undeclared
 * import fails loudly.
 */
const buildLibrary = (
  config: BundleConfig,
  stageDir: string,
): ReadonlyArray<string> => {
  const external = deriveExternal(config.root);
  const written: string[] = [];
  for (const entry of config.entries) {
    const entryFile = join(
      config.root,
      config.rootDir,
      entry.input,
    );
    const graph = collectModules({
      entryFile,
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
        entryFile,
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
  return written;
};

/**
 * App build: a single self-contained `es` bundle per
 * entry with every workspace sibling INLINED from source
 * (the mirror of the library externalization — a browser
 * cannot resolve a bare `import "plgg"`). Only `node:*`
 * stays external. No CJS, no export-surface discovery
 * (an app entry has side effects and no exports, and the
 * vm sandbox has no DOM to run it), and no `.d.ts`
 * (nothing consumes the app).
 */
const buildApp = (
  config: BundleConfig,
  stageDir: string,
): ReadonlyArray<string> => {
  const packages = discoverWorkspace(config.root);
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
      external: NODE_EXTERNAL,
      resolve: (specifier, fromFile) =>
        resolveWorkspaceSpecifier({
          specifier,
          fromFile,
          packages,
        }),
    });
    const rel = applyFileName(
      config.fileNamePattern,
      entry.name,
      "es",
    );
    writeOut(
      join(stageDir, rel),
      emitEsmBundle(graph, []),
    );
    written.push(rel);
  }
  return written;
};

/**
 * The app's only external: Node built-ins. Everything
 * else (plgg + siblings) is inlined.
 */
const NODE_EXTERNAL = /^node:/;

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
  entryFile: string,
  graph: Graph,
  destDir: string,
): ReadonlyArray<string> => {
  const cjs = emitCjsBundle(graph);
  // Derive the exact ESM export surface STATICALLY from
  // the entry module's TypeScript source — ESM cannot
  // declare its exports dynamically, so the emitter needs
  // the precise named-export list. (Previously discovered
  // by executing the CJS bundle in a `node:vm`; retired
  // for the static `vendors/exportSurface` derivation, so
  // no target-package node_modules must be resolvable and
  // no arbitrary module top-level code runs at build time.)
  const esm = emitEsmBundle(
    graph,
    deriveExportNames({
      entryFile,
      root: config.root,
      aliasPrefix: config.alias.prefix,
      aliasSrcRoot: config.alias.srcRoot,
    }),
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
