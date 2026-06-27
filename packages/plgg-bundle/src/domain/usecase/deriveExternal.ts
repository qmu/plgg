import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type External } from "plgg-bundle/domain/model/BundleConfig";

/**
 * Derive a package's externals from its `package.json`
 * (the declared dependency graph) plus Node builtins —
 * the ruling-B rule, so externals cannot drift from what
 * the manifest says the package depends on. Anything a
 * module imports that is neither the package's own
 * source (self-alias / relative) nor a declared
 * dependency nor `node:*` is an *undeclared* dependency
 * and the graph walk fails loudly rather than silently
 * inlining or externalizing it.
 *
 * Declared = keys of `dependencies` + `peerDependencies`
 * + `optionalDependencies`. Imports are bare specifiers
 * (no subpaths in this repo), matched exactly; `node:*`
 * is matched by prefix.
 */
export const deriveExternal = (
  root: string,
): External => {
  const declared = declaredDeps(root);
  return (specifier: string): boolean =>
    declared.has(specifier) ||
    specifier.startsWith("node:");
};

/**
 * The set of declared dependency names from a package's
 * `package.json`. Throws (re-thrown with context) if the
 * manifest is missing or unparseable.
 */
const declaredDeps = (
  root: string,
): ReadonlySet<string> => {
  const path = join(root, "package.json");
  const parsed = parse(path, read(path));
  return new Set([
    ...keysOf(parsed, "dependencies"),
    ...keysOf(parsed, "peerDependencies"),
    ...keysOf(parsed, "optionalDependencies"),
  ]);
};

const read = (path: string): string => {
  try {
    return readFileSync(path, "utf8");
  } catch (cause) {
    throw new Error(
      `IoError: cannot read ${path}: ${messageOf(
        cause,
      )}`,
    );
  }
};

const parse = (
  path: string,
  text: string,
): unknown => {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(
      `ConfigError: ${path} is not valid JSON: ${messageOf(
        cause,
      )}`,
    );
  }
};

/**
 * The keys of one dependency map on a parsed
 * package.json, narrowing at the `unknown` boundary.
 */
const keysOf = (
  pkg: unknown,
  field: string,
): ReadonlyArray<string> => {
  if (!isRecord(pkg)) {
    return [];
  }
  const map = pkg[field];
  return isRecord(map) ? Object.keys(map) : [];
};

/**
 * Whether a value is a non-null object (records the
 * narrowing for property reads).
 */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
