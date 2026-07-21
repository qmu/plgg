import { readFileSync } from "plgg-bundle/vendors/nodeFs";
import { relative } from "plgg-bundle/vendors/nodePath";
import { type External } from "plgg-bundle/domain/model/BundleConfig";
import { resolveSpecifier } from "plgg-bundle/domain/usecase/resolveSpecifier";
import { isExternal } from "plgg-bundle/domain/usecase/isExternal";
import { transpileToCjs } from "plgg-bundle/vendors/transpiler";
import { externalKey } from "plgg-bundle/domain/usecase/externalsTable";

/**
 * One bundled module: its stable id (path relative to
 * the package root, the same string the runtime keys
 * on), its transpiled-and-rewritten CJS body, and the
 * external specifiers it still requires at runtime.
 */
export type Module = Readonly<{
  id: string;
  code: string;
  externals: ReadonlyArray<string>;
}>;

/**
 * The module graph reachable from an entry — the set of
 * reachable modules plus the entry's own id. Dependency
 * order is not required: the registry runtime links
 * lazily by id.
 */
export type Graph = Readonly<{
  entryId: string;
  modules: ReadonlyArray<Module>;
}>;

/**
 * Walk the import graph from `entryFile`, transpiling
 * each `.ts` to CJS, resolving every `require(...)`
 * specifier to either an intra-bundle module id (to
 * inline) or an external (to keep as a runtime
 * require), and rewriting the inlined `require("spec")`
 * calls to `require("<id>")`. Pure in-house graph logic;
 * only the per-file TS→JS step is vendored. Throws on an
 * unresolvable import or a read failure.
 */
export const collectModules = (args: {
  entryFile: string;
  root: string;
  aliasPrefix: string;
  aliasSrcRoot: string;
  external: External;
  /**
   * App-mode override: resolve a specifier to a source
   * file (inlining workspace siblings). When absent, the
   * library default resolves only relative imports and
   * the package's own self-alias.
   */
  resolve?: Resolve;
}): Graph => {
  const ctx: Ctx = {
    root: args.root,
    external: args.external,
    resolve:
      args.resolve ??
      ((specifier, fromFile) =>
        resolveSpecifier({
          specifier,
          fromFile,
          aliasPrefix: args.aliasPrefix,
          aliasSrcRoot: args.aliasSrcRoot,
        })),
  };
  const acc = new Map<string, Module>();
  walk(ctx, args.entryFile, acc);
  return {
    entryId: idOf(args.root, args.entryFile),
    modules: [...acc.values()],
  };
};

/**
 * Resolve an import specifier (from `fromFile`) to an
 * absolute source file, or `undefined` if it is not a
 * bundled module (external / unresolvable).
 */
export type Resolve = (
  specifier: string,
  fromFile: string,
) => string | undefined;

/**
 * The threaded walk context: the package root (for ids),
 * the external predicate, and the resolver.
 */
type Ctx = Readonly<{
  root: string;
  external: External;
  resolve: Resolve;
}>;

/**
 * Depth-first accumulation into a Map keyed by id, so a
 * diamond import is transpiled once. Mutates `acc`.
 */
const walk = (
  ctx: Ctx,
  file: string,
  acc: Map<string, Module>,
): void => {
  const id = idOf(ctx.root, file);
  if (acc.has(id)) {
    return;
  }
  const cjs = transpileToCjs(
    file,
    readSource(file),
  );
  const deps = linkModule(
    ctx,
    file,
    id,
    cjs,
    acc,
  );
  for (const depFile of deps) {
    walk(ctx, depFile, acc);
  }
};

/**
 * Resolve and rewrite every `require(...)` in a
 * transpiled module, register it in `acc`, and return
 * the resolved file paths of its intra-bundle deps.
 * Throws on an unresolvable (non-external) specifier.
 */
const linkModule = (
  ctx: Ctx,
  file: string,
  id: string,
  cjs: string,
  acc: Map<string, Module>,
): ReadonlyArray<string> => {
  const specifiers = inlineRequireSpecifiers(
    file,
    cjs,
  );
  const externals: string[] = [];
  const deps: string[] = [];
  let rewritten = cjs;
  for (const spec of specifiers) {
    if (isExternal(ctx.external, spec)) {
      externals.push(spec);
      continue;
    }
    const resolved = ctx.resolve(spec, file);
    if (resolved === undefined) {
      throw new Error(
        `ResolveError: cannot resolve "${spec}" from ${id}`,
      );
    }
    deps.push(resolved);
    rewritten = replaceRequire(
      rewritten,
      spec,
      idOf(ctx.root, resolved),
    );
    if (isInstalledDist(file)) {
      rewritten = replaceExternalKey(
        rewritten,
        spec,
        idOf(ctx.root, resolved),
      );
    }
  }
  acc.set(id, {
    id,
    code: rewritten,
    externals,
  });
  return deps;
};

/**
 * Literal requires that belong to the OUTER graph walk.
 * Registry-installed plgg-family packages ship
 * pre-bundled dist entries whose internal module table
 * still contains strings like `require("src/index.ts")`.
 * Those are parameters of the INNER registry runtime and
 * must not be resolved or rewritten by this app bundle.
 * Real top-level externals in that dist file remain, e.g.
 * `require("plgg")`, and are still inlined by the app
 * graph.
 */
const inlineRequireSpecifiers = (
  file: string,
  cjs: string,
): ReadonlyArray<string> => {
  const specifiers = requireSpecifiers(cjs);
  if (!isInstalledDist(file)) {
    return specifiers;
  }
  const internal = bundledModuleIds(cjs);
  return specifiers.filter(
    (spec) => !internal.has(spec),
  );
};

/**
 * Whether a file is a registry-installed built JS entry.
 * Source packages under the monorepo are never matched.
 */
const isInstalledDist = (
  file: string,
): boolean => {
  const normalized = file.split("\\").join("/");
  return (
    normalized.includes("/node_modules/") &&
    normalized.includes("/dist/") &&
    normalized.endsWith(".js")
  );
};

/**
 * Module ids declared inside a plgg-bundle emitted
 * registry object: `"src/x.ts": function (...) { ... }`.
 */
const bundledModuleIds = (
  cjs: string,
): ReadonlySet<string> =>
  new Set(
    [
      ...cjs.matchAll(
        /["']([^"']+)["']\s*:\s*function\s*\(/g,
      ),
    ].flatMap((m) =>
      m[1] === undefined ? [] : [m[1]],
    ),
  );

/**
 * Read a source file, re-throwing with context.
 */
const readSource = (file: string): string => {
  try {
    return readFileSync(file, "utf8");
  } catch (cause) {
    throw new Error(
      `IoError: cannot read ${file}: ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
    );
  }
};

/**
 * A module's stable id: its path relative to the
 * package root, POSIX-normalized. The runtime keys on
 * exactly this string.
 */
const idOf = (
  root: string,
  file: string,
): string =>
  relative(root, file).split("\\").join("/");

/**
 * Extract the literal string specifiers of all
 * top-level `require("...")` / `require('...')` calls
 * a transpiled CJS module makes.
 *
 * A captured specifier containing `${` is not a real
 * import — it is a template-literal FRAGMENT of code that
 * happens to spell a require call, e.g. plgg-bundle's own
 * `` `require("${spec}")` `` rewrite strings
 * (`replaceRequire`). This matters when the bundler bundles
 * ITSELF (the `cli` target): its source literally contains
 * `require("…")` text as data. A genuine static
 * `require("<spec>")` specifier can never contain `${` (a
 * `${` only occurs inside a backtick template, which the
 * `["']` quotes here do not match), so dropping these is
 * safe for every build and never hides a real dependency.
 */
const requireSpecifiers = (
  cjs: string,
): ReadonlyArray<string> =>
  [
    ...cjs.matchAll(
      /require\(\s*["']([^"']+)["']\s*\)/g,
    ),
  ].flatMap((m) =>
    m[1] === undefined || m[1].includes("${")
      ? []
      : [m[1]],
  );

/**
 * Rewrite an inlined dist's inner `__externals` table
 * key from the original specifier to the outer module
 * id. A plgg-bundle ESM dist resolves an external
 * required inside its inner module bodies through this
 * table; {@link replaceRequire} rewrites those bodies'
 * `require("<spec>")` calls to the outer id, so the key
 * must follow or the inner lookup misses and falls into
 * the transpiled dynamic-import fallback — a Promise
 * where the consumer expects a namespace ("plgg_1.box
 * is not a function"). Matches the shared
 * {@link externalKey} binding the emitter writes
 * (`"<spec>": __ext`), so the rewrite tracks the emitted
 * shape rather than a hand-written printer literal, and
 * ordinary code never collides with it.
 */
const replaceExternalKey = (
  cjs: string,
  spec: string,
  id: string,
): string =>
  cjs
    .split(externalKey(spec))
    .join(externalKey(id));

/**
 * Rewrite every `require("spec")` occurrence to
 * `require("id")`. Operates on the exact specifier
 * string so distinct specifiers do not interfere.
 */
const replaceRequire = (
  cjs: string,
  spec: string,
  id: string,
): string =>
  cjs
    .split(`require("${spec}")`)
    .join(`require("${id}")`)
    .split(`require('${spec}')`)
    .join(`require("${id}")`);
