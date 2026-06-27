import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { type External } from "plgg-bundle/domain/model/BundleConfig";
import { resolveSpecifier } from "plgg-bundle/domain/usecase/resolveSpecifier";
import { isExternal } from "plgg-bundle/domain/usecase/isExternal";
import { transpileToCjs } from "plgg-bundle/vendors/transpiler";

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
}): Graph => {
  const acc = new Map<string, Module>();
  walk(args, args.entryFile, acc);
  return {
    entryId: idOf(args.root, args.entryFile),
    modules: [...acc.values()],
  };
};

/**
 * Depth-first accumulation into a Map keyed by id, so a
 * diamond import is transpiled once. Mutates `acc`.
 */
const walk = (
  args: {
    root: string;
    aliasPrefix: string;
    aliasSrcRoot: string;
    external: External;
  },
  file: string,
  acc: Map<string, Module>,
): void => {
  const id = idOf(args.root, file);
  if (acc.has(id)) {
    return;
  }
  const cjs = transpileToCjs(
    file,
    readSource(file),
  );
  const deps = linkModule(
    args,
    file,
    id,
    cjs,
    acc,
  );
  for (const depFile of deps) {
    walk(args, depFile, acc);
  }
};

/**
 * Resolve and rewrite every `require(...)` in a
 * transpiled module, register it in `acc`, and return
 * the resolved file paths of its intra-bundle deps.
 * Throws on an unresolvable (non-external) specifier.
 */
const linkModule = (
  args: {
    root: string;
    aliasPrefix: string;
    aliasSrcRoot: string;
    external: External;
  },
  file: string,
  id: string,
  cjs: string,
  acc: Map<string, Module>,
): ReadonlyArray<string> => {
  const specifiers = requireSpecifiers(cjs);
  const externals: string[] = [];
  const deps: string[] = [];
  let rewritten = cjs;
  for (const spec of specifiers) {
    if (isExternal(args.external, spec)) {
      externals.push(spec);
      continue;
    }
    const resolved = resolveSpecifier({
      specifier: spec,
      fromFile: file,
      aliasPrefix: args.aliasPrefix,
      aliasSrcRoot: args.aliasSrcRoot,
    });
    if (resolved === undefined) {
      throw new Error(
        `ResolveError: cannot resolve "${spec}" from ${id}`,
      );
    }
    deps.push(resolved);
    rewritten = replaceRequire(
      rewritten,
      spec,
      idOf(args.root, resolved),
    );
  }
  acc.set(id, {
    id,
    code: rewritten,
    externals,
  });
  return deps;
};

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
 */
const requireSpecifiers = (
  cjs: string,
): ReadonlyArray<string> =>
  [
    ...cjs.matchAll(
      /require\(\s*["']([^"']+)["']\s*\)/g,
    ),
  ].flatMap((m) =>
    m[1] === undefined ? [] : [m[1]],
  );

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
