import {
  readdirSync,
  readFileSync,
  existsSync,
} from "node:fs";
import {
  resolve,
  dirname,
  join,
} from "node:path";
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

/** The app self-alias used to resolve non-relative local edges. */
export type Alias = Readonly<{
  prefix: string;
  root: string;
  srcRoot: string;
}>;

/**
 * Scan the watch roots and build the local
 * {@link ModuleGraph}. Unreadable roots/files are skipped
 * (a scan is best-effort — the reload decision falls back
 * to reloading when the graph is empty).
 */
export const scanGraph = (
  roots: ReadonlyArray<string>,
  alias: Alias,
): ModuleGraph =>
  buildGraph(
    sourceFiles(roots).flatMap((file) =>
      edgesOf(file, alias),
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

/** Recursively list source files under a directory. */
const walk = (
  root: string,
): ReadonlyArray<string> => {
  try {
    return readdirSync(root, {
      recursive: true,
      withFileTypes: true,
    }).flatMap((entry) =>
      entry.isFile() &&
      SOURCE_EXT.some((e) =>
        entry.name.endsWith(e),
      )
        ? [join(entry.parentPath, entry.name)]
        : [],
    );
  } catch {
    return [];
  }
};

/** The resolved local edges a single file imports. */
const edgesOf = (
  file: string,
  alias: Alias,
): ReadonlyArray<{ from: string; to: string }> => {
  const source = read(file);
  if (source === null) {
    return [];
  }
  return parseImports(source).flatMap((spec) => {
    const to = resolveLocal(file, spec, alias);
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
 * paths and the app's self-alias (`prefix` / `prefix/…`);
 * tries the path itself, `.ts`, and `/index.ts`.
 */
const resolveLocal = (
  from: string,
  spec: string,
  alias: Alias,
): string | null => {
  const base = baseOf(from, spec, alias);
  if (base === null) {
    return null;
  }
  const candidates = [
    base,
    `${base}.ts`,
    join(base, "index.ts"),
  ];
  return (
    candidates.find((c) => existsSync(c)) ??
    null
  );
};

/** The pre-extension base path a specifier points at. */
const baseOf = (
  from: string,
  spec: string,
  alias: Alias,
): string | null => {
  if (
    spec.startsWith("./") ||
    spec.startsWith("../")
  ) {
    return resolve(dirname(from), spec);
  }
  if (spec === alias.prefix) {
    return join(alias.root, alias.srcRoot);
  }
  if (spec.startsWith(`${alias.prefix}/`)) {
    return join(
      alias.root,
      alias.srcRoot,
      spec.slice(alias.prefix.length + 1),
    );
  }
  return null;
};
