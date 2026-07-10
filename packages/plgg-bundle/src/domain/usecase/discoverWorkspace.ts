import {
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
} from "plgg-bundle/vendors/nodeFs";
import { join, dirname } from "plgg-bundle/vendors/nodePath";

/**
 * A package the app bundler can INLINE. Monorepo
 * siblings are inlined from `src`; registry-installed
 * packages usually ship only `dist`, so the resolver
 * inlines their built ESM entry instead.
 */
export type WorkspacePackage =
  | SourceWorkspacePackage
  | DistWorkspacePackage;

/**
 * A source package, usually a sibling under `packages/`.
 * Its public export subpaths are reversed from
 * `exports` dist paths back to `src` entries.
 */
export type SourceWorkspacePackage = Readonly<{
  kind: "source";
  name: string;
  dir: string;
  srcDir: string;
  /** export subpath (`"."` | `"./x"`) → dist default. */
  exports: ReadonlyMap<string, string>;
}>;

/**
 * A dist package, usually installed under the app's
 * `node_modules`. It has no source in the consumer tree,
 * so public export subpaths resolve to built ESM files.
 */
export type DistWorkspacePackage = Readonly<{
  kind: "dist";
  name: string;
  dir: string;
  distDir: string;
  /** export subpath (`"."` | `"./x"`) → dist default. */
  exports: ReadonlyMap<string, string>;
}>;

/**
 * Discover inlineable packages visible from `packageRoot`:
 * sibling packages under the directory that holds
 * `packageRoot`, plus packages installed in this package's
 * own `node_modules` and in sibling source packages'
 * `node_modules`. Siblings are listed first and win on
 * duplicate names so monorepo builds keep reading source.
 * Sorted longest-name-first so a later prefix match picks
 * `plgg-view` over `plgg`.
 */
export const discoverWorkspace = (
  packageRoot: string,
): ReadonlyArray<WorkspacePackage> => {
  const siblingsDir = dirname(packageRoot);
  const siblings = packageDirsIn(siblingsDir);
  return uniqueByName([
    ...siblings,
    ...packageDirsIn(join(packageRoot, "node_modules")),
    ...siblings.flatMap((dir) =>
      packageDirsIn(join(dir, "node_modules")),
    ),
  ])
    .map(readPackage)
    .flatMap((p) => (p === undefined ? [] : [p]))
    .sort(
      (a, b) => b.name.length - a.name.length,
    );
};

/**
 * Direct package dirs under `dir`, including scoped
 * `@scope/name` packages. Missing directories simply
 * contribute no packages.
 */
const packageDirsIn = (
  dir: string,
): ReadonlyArray<string> =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((name) =>
        childPackageDirs(join(dir, name)),
      )
    : [];

/**
 * The package dirs represented by one child of a package
 * collection directory. A scope directory fans out one
 * level; ordinary package directories are returned as-is.
 */
const childPackageDirs = (
  dir: string,
): ReadonlyArray<string> => {
  if (!statSync(dir).isDirectory()) {
    return [];
  }
  if (isPackageDir(dir)) {
    return [dir];
  }
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter(isPackageDir);
};

/**
 * Keep the first directory for each package name. The
 * caller supplies siblings before node_modules, so a local
 * source package beats an installed copy.
 */
const uniqueByName = (
  dirs: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of dirs) {
    const name = packageName(dir);
    if (name === undefined || seen.has(name)) {
      continue;
    }
    seen.add(name);
    out.push(dir);
  }
  return out;
};

/**
 * Whether a path is a directory holding a package.json.
 */
const isPackageDir = (dir: string): boolean =>
  statSync(dir).isDirectory() &&
  existsSync(join(dir, "package.json"));

/**
 * Read one package's manifest into a
 * {@link WorkspacePackage}, or `undefined` when it
 * declares no `name`. Throws on unreadable/invalid JSON.
 */
const readPackage = (
  dir: string,
): WorkspacePackage | undefined => {
  const pkg = parseJson(
    join(dir, "package.json"),
  );
  const name = pkg["name"];
  if (typeof name !== "string") {
    return undefined;
  }
  const srcDir = join(dir, "src");
  if (existsSync(srcDir)) {
    return {
      kind: "source",
      name,
      dir,
      srcDir,
      exports: exportMap(pkg),
    };
  }
  const distDir = join(dir, "dist");
  if (existsSync(distDir)) {
    return {
      kind: "dist",
      name,
      dir,
      distDir,
      exports: exportMap(pkg),
    };
  }
  return undefined;
};

/**
 * Read only the package name for de-duplication.
 */
const packageName = (
  dir: string,
): string | undefined => {
  if (!isPackageDir(dir)) {
    return undefined;
  }
  const pkg = parseJson(join(dir, "package.json"));
  const name = pkg["name"];
  return typeof name === "string" ? name : undefined;
};

/**
 * Parse a `package.json`, re-throwing with context.
 */
const parseJson = (
  path: string,
): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(path, "utf8"),
    );
    return isRecord(parsed) ? parsed : {};
  } catch (cause) {
    throw new Error(
      `WorkspaceError: cannot read ${path}: ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
    );
  }
};

/**
 * Build the subpath → dist-default map from an `exports`
 * field, tolerating both shapes used in the repo:
 * - a subpath map (`{ ".": …, "./client": … }`), and
 * - a bare conditions object (`{ import: …, require: … }`)
 *   which IS the `"."` export.
 */
const exportMap = (
  pkg: Record<string, unknown>,
): ReadonlyMap<string, string> => {
  const exports = pkg["exports"];
  const out = new Map<string, string>();
  if (!isRecord(exports)) {
    return out;
  }
  if (isSubpathMap(exports)) {
    for (const [key, val] of Object.entries(
      exports,
    )) {
      const def = conditionDefault(val);
      if (def !== undefined) {
        out.set(key, def);
      }
    }
    return out;
  }
  const def = conditionDefault(exports);
  if (def !== undefined) {
    out.set(".", def);
  }
  return out;
};

/**
 * Whether an `exports` object is a subpath map (its keys
 * are `.`/`./…` paths) rather than a bare conditions
 * object (keys like `import`/`require`).
 */
const isSubpathMap = (
  exports: Record<string, unknown>,
): boolean =>
  Object.keys(exports).some((k) =>
    k.startsWith("."),
  );

/**
 * Extract the resolved default file from a conditions
 * object: the `import` (or `require`) branch's `default`,
 * or a directly-stringed condition. Returns `undefined`
 * when none is present.
 */
const conditionDefault = (
  conditions: unknown,
): string | undefined => {
  if (typeof conditions === "string") {
    return conditions;
  }
  if (!isRecord(conditions)) {
    return undefined;
  }
  return (
    branchDefault(conditions["import"]) ??
    branchDefault(conditions["require"]) ??
    branchDefault(conditions["default"])
  );
};

/**
 * The `default` of one condition branch, where the branch
 * is either a string or a `{ types, default }` object.
 */
const branchDefault = (
  branch: unknown,
): string | undefined =>
  typeof branch === "string"
    ? branch
    : isRecord(branch) &&
        typeof branch["default"] === "string"
      ? branch["default"]
      : undefined;

/**
 * Whether a value is a non-null object.
 */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
