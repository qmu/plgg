import {
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
} from "plgg-bundle/vendors/nodeFs";
import { join, dirname } from "plgg-bundle/vendors/nodePath";

/**
 * A workspace sibling the app bundler can INLINE from
 * source: its package `name`, its `dir`, and the map from
 * each public export subpath (`"."`, `"./client"`, …) to
 * the `import.default` dist path declared in its
 * `package.json` `exports`. The app resolver reverses
 * that dist path to the entry's source file (so the
 * `./style` → `dist/styleEntry.es.js` → `src/styleEntry`
 * rename is honoured), and falls back to a self-alias
 * `name/<path>` → `src/<path>` for non-export internal
 * imports.
 */
export type WorkspacePackage = Readonly<{
  name: string;
  dir: string;
  /** export subpath (`"."` | `"./x"`) → dist default. */
  exports: ReadonlyMap<string, string>;
}>;

/**
 * Discover every sibling package under the directory that
 * holds `packageRoot` (the monorepo `packages/` dir) —
 * each entry that has a `package.json` with a `name`.
 * Sorted longest-name-first so a later prefix match picks
 * `plgg-view` over `plgg`. Throws on a read/parse failure.
 */
export const discoverWorkspace = (
  packageRoot: string,
): ReadonlyArray<WorkspacePackage> => {
  const siblingsDir = dirname(packageRoot);
  return readdirSync(siblingsDir)
    .map((name) => join(siblingsDir, name))
    .filter(isPackageDir)
    .map(readPackage)
    .flatMap((p) => (p === undefined ? [] : [p]))
    .sort(
      (a, b) => b.name.length - a.name.length,
    );
};

/**
 * Whether a path is a directory holding a
 * `package.json`.
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
  return typeof name === "string"
    ? { name, dir, exports: exportMap(pkg) }
    : undefined;
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
