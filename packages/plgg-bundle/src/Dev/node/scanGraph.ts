import {
  readdirSync,
  readFileSync,
  statSync,
} from "plgg-bundle/vendors/nodeFs";
import {
  resolve,
  dirname,
  join,
} from "plgg-bundle/vendors/nodePath";
import { parseImports } from "plgg-bundle/Dev/usecase/parseImports";
import { buildGraph } from "plgg-bundle/Dev/usecase/buildGraph";
import { type ModuleGraph } from "plgg-bundle/Dev/model/ModuleGraph";

// The effectful graph scan: walk the watch roots, read
// each source file, and resolve its LOCAL import edges
// (relative specifiers + the app's own self-alias) to
// absolute paths. Feeds the pure `buildGraph` /
// reload-decision. In `Dev/node/` (fs seam), excluded from
// the coverage threshold and exercised by the fixture PoC.

/** Source extensions whose imports are scanned. */
const SOURCE_EXT: ReadonlyArray<string> = [
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".mjs",
];

/**
 * A self-alias resolution rule: `<prefix>`/`<prefix>/<sub>`
 * → `<srcDir>`/`<srcDir>/<sub>`. One per package whose
 * source participates in dev (the app's own, plus any
 * cross-package `sourceAliases`).
 */
export type Alias = Readonly<{
  prefix: string;
  srcDir: string;
}>;

/**
 * Scan the watch roots and build the local
 * {@link ModuleGraph}, resolving relative AND aliased
 * imports (every rule in `aliases`) so cross-package source
 * edges are captured. Unreadable roots/files are skipped (a
 * scan is best-effort — the reload decision falls back to
 * reloading when the graph is empty).
 */
export const scanGraph = (
  roots: ReadonlyArray<string>,
  aliases: ReadonlyArray<Alias>,
): ModuleGraph =>
  buildGraph(
    sourceFiles(roots).flatMap((file) =>
      edgesOf(file, aliases),
    ),
  );

/** Every source file under the roots (recursive, de-duped). */
const sourceFiles = (
  roots: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const seen = new Set<string>();
  for (const root of roots) {
    for (const abs of walk(root)) {
      seen.add(abs);
    }
  }
  return [...seen];
};

/**
 * Directories never descended into during the graph scan —
 * dependency trees, build output, VCS. A watch root of `.`
 * (a package dir) would otherwise pull thousands of
 * `node_modules` files into the graph.
 */
const SKIP_DIRS: ReadonlyArray<string> = [
  "node_modules",
  "dist",
  ".git",
];

/**
 * Recursively list source files under a directory, pruning
 * {@link SKIP_DIRS}. A manual walk (not `readdirSync`'s
 * `recursive`) so a huge `node_modules` is never read.
 */
const walk = (
  root: string,
): ReadonlyArray<string> => {
  let entries;
  try {
    entries = readdirSync(root, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRS.includes(entry.name)
        ? []
        : walk(abs);
    }
    return entry.isFile() &&
      SOURCE_EXT.some((e) =>
        entry.name.endsWith(e),
      )
      ? [abs]
      : [];
  });
};

/** The resolved local edges a single file imports. */
const edgesOf = (
  file: string,
  aliases: ReadonlyArray<Alias>,
): ReadonlyArray<{ from: string; to: string }> => {
  const source = read(file);
  if (source === null) {
    return [];
  }
  return parseImports(source).flatMap((spec) => {
    const to = resolveLocal(file, spec, aliases);
    return to === null
      ? []
      : [{ from: file, to }];
  });
};

/** Read a file, or null when it cannot be read. */
const read = (file: string): string | null => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
};

/**
 * Resolve a specifier to an absolute local file, or null
 * for a package / `node:` specifier. Handles relative
 * paths and every alias rule (`prefix` / `prefix/…`); tries
 * the path itself, `.ts`, and `/index.ts`.
 */
const resolveLocal = (
  from: string,
  spec: string,
  aliases: ReadonlyArray<Alias>,
): string | null => {
  const base = baseOf(from, spec, aliases);
  if (base === null) {
    return null;
  }
  const candidates = [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ];
  // A FILE, never a directory: a bare `<prefix>` base is
  // the src dir (which exists) — prefer its `index.ts`.
  return (
    candidates.find(isFile) ?? null
  );
};

/** Whether a path exists and is a regular file. */
const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** The pre-extension base path a specifier points at. */
const baseOf = (
  from: string,
  spec: string,
  aliases: ReadonlyArray<Alias>,
): string | null => {
  if (
    spec.startsWith("./") ||
    spec.startsWith("../")
  ) {
    return resolve(dirname(from), spec);
  }
  for (const alias of aliases) {
    if (spec === alias.prefix) {
      return alias.srcDir;
    }
    if (spec.startsWith(`${alias.prefix}/`)) {
      return join(
        alias.srcDir,
        spec.slice(alias.prefix.length + 1),
      );
    }
  }
  return null;
};
