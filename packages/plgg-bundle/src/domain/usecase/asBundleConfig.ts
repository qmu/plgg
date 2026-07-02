import {
  type BundleConfig,
  type DevConfig,
  type Entry,
  type Format,
  type Target,
} from "plgg-bundle/domain/model/BundleConfig";

/**
 * Validate an `unknown` value (a dynamically-imported
 * config module's default export) into a typed
 * {@link BundleConfig}. The config is the bundler's
 * `unknown` boundary, so every field is narrowed with a
 * real guard (`typeof`, `Array.isArray`) — no `as`, no
 * `any`. Throws a `ConfigError` on the first invalid
 * field.
 *
 * Externals are NOT a config field: the bundler derives
 * them from the package's `package.json` dependency
 * graph (see `deriveExternal`), so they cannot drift
 * from the manifest.
 */
export const asBundleConfig = (
  value: unknown,
): BundleConfig => {
  if (!isRecord(value)) {
    return fail("config is not an object");
  }
  const devSection = dev(value);
  return {
    target: target(value),
    root: str(value, "root"),
    rootDir: str(value, "rootDir"),
    outDir: str(value, "outDir"),
    fileNamePattern: str(
      value,
      "fileNamePattern",
    ),
    entries: entries(value),
    formats: formats(value),
    alias: alias(value),
    // `exactOptionalPropertyTypes`: only attach `dev` when
    // the config actually declared it (never `dev:
    // undefined`).
    ...(devSection === undefined
      ? {}
      : { dev: devSection }),
  };
};

/**
 * The optional `dev` section (see {@link DevConfig}).
 * Absent → `undefined` (a build-only library). Present →
 * every field narrowed at the boundary.
 */
const dev = (
  o: Record<string, unknown>,
): DevConfig | undefined => {
  const raw = o["dev"];
  if (raw === undefined) {
    return undefined;
  }
  if (!isRecord(raw)) {
    return fail(`"dev" must be an object`);
  }
  return {
    entry: str(raw, "entry"),
    port: num(raw, "port"),
    watch: strArray(raw, "watch"),
    allowedHosts: strArray(
      raw,
      "allowedHosts",
    ),
  };
};

/**
 * A required finite-number field.
 */
const num = (
  o: Record<string, unknown>,
  key: string,
): number => {
  const v = o[key];
  return typeof v === "number" &&
    Number.isFinite(v)
    ? v
    : fail(`"${key}" must be a number`);
};

/**
 * A required array-of-strings field. Maps each element
 * through a string guard (mirroring `entries`/`formats`)
 * so the result is a real `string[]` — never a leaked
 * `any[]` from `Array.isArray`.
 */
const strArray = (
  o: Record<string, unknown>,
  key: string,
): ReadonlyArray<string> => {
  const v = o[key];
  return Array.isArray(v)
    ? v.map((e) => strElem(e, key))
    : fail(`"${key}" must be an array`);
};

const strElem = (
  e: unknown,
  key: string,
): string =>
  typeof e === "string"
    ? e
    : fail(
        `each "${key}" entry must be a string`,
      );

/**
 * The optional `target` field — `"library"` (default) or
 * `"app"`. Absent means a library, so the existing
 * library configs need no change.
 */
const target = (
  o: Record<string, unknown>,
): Target => {
  const v = o["target"];
  return v === undefined || v === "library"
    ? "library"
    : v === "app"
      ? "app"
      : fail(
          `"target" must be "library" or "app"`,
        );
};

/**
 * Throw a config validation error. Return type `never`
 * so a failed check is a dead end at the call site.
 */
const fail = (message: string): never => {
  throw new Error(`ConfigError: ${message}`);
};

/**
 * Whether a value is a non-null object (records the
 * narrowing for property reads).
 */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * A required string field.
 */
const str = (
  o: Record<string, unknown>,
  key: string,
): string => {
  const v = o[key];
  return typeof v === "string"
    ? v
    : fail(`"${key}" must be a string`);
};

/**
 * The `entries` array: each element an object with
 * string `name` and `input`.
 */
const entries = (
  o: Record<string, unknown>,
): ReadonlyArray<Entry> => {
  const raw = o["entries"];
  return Array.isArray(raw)
    ? raw.map(entry)
    : fail(`"entries" must be an array`);
};

const entry = (raw: unknown): Entry =>
  isRecord(raw) &&
  typeof raw["name"] === "string" &&
  typeof raw["input"] === "string"
    ? { name: raw["name"], input: raw["input"] }
    : fail(
        `each entry needs string "name" and "input"`,
      );

/**
 * The `formats` array: each `"es"` or `"cjs"`.
 */
const formats = (
  o: Record<string, unknown>,
): ReadonlyArray<Format> => {
  const raw = o["formats"];
  return Array.isArray(raw)
    ? raw.map(format)
    : fail(`"formats" must be an array`);
};

const format = (raw: unknown): Format =>
  raw === "es" || raw === "cjs"
    ? raw
    : fail(`each format must be "es" or "cjs"`);

/**
 * The `alias` object: string `prefix` and `srcRoot`.
 */
const alias = (
  o: Record<string, unknown>,
): Readonly<{
  prefix: string;
  srcRoot: string;
}> => {
  const raw = o["alias"];
  return isRecord(raw) &&
    typeof raw["prefix"] === "string" &&
    typeof raw["srcRoot"] === "string"
    ? {
        prefix: raw["prefix"],
        srcRoot: raw["srcRoot"],
      }
    : fail(
        `"alias" needs string "prefix" and "srcRoot"`,
      );
};
