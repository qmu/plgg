// Plain-TS build tool: a foundation bundler must not
// depend on the library it builds (plgg), so this
// package is written in plain TypeScript — native
// control flow, throw-on-failure caught at the bin
// boundary — rather than plgg's Result/Option idiom.
// See README. The CLAUDE.md no-`as`/`any`/`ts-ignore`
// rule still holds.

/**
 * The output module formats. `"es"` → ESM, `"cjs"` →
 * CommonJS — both emitted today by every library
 * package.
 */
export type Format = "es" | "cjs";

/**
 * What kind of artifact a config builds.
 * - `"library"` (default): a consumed package — dual
 *   `es`/`cjs` per entry, a per-file `.d.ts` tree, and
 *   sibling/`node:*` deps left EXTERNAL (ruling B), so the
 *   bundle stays faithful to its declared dependencies.
 * - `"app"`: the leaf application (the `example` client) —
 *   a single self-contained `es` bundle with every
 *   workspace sibling INLINED from source (the mirror of
 *   the library decision: the app is where bundling deps
 *   is correct, since a browser cannot resolve a bare
 *   `import "plgg"`). No `.d.ts` (nothing consumes it) and
 *   only `node:*` stays external.
 */
export type Target = "library" | "app";

/**
 * A way to decide whether an imported specifier is
 * *external* (left as a runtime `import`/`require`,
 * not inlined into the bundle). Mirrors the three
 * shapes used across the vite configs:
 * - a string array of exact specifiers,
 * - a `RegExp` (e.g. `/^node:/`),
 * - a predicate function (plgg-fetch's
 *   `isFrameworkDep`).
 */
export type External =
  | ReadonlyArray<string>
  | RegExp
  | ((specifier: string) => boolean);

/**
 * One build entry. `name` is the output key — for most
 * packages it equals the file stem, but `plgg-view`'s
 * `styleEntry` / `plgg-server`'s `ssgEntry` use a
 * distinct output key so `dist/styleEntry.*` does not
 * case-collide with the `dist/Style/` declaration tree
 * on case-insensitive filesystems (the U0 fix). The
 * emitted JS file is `name` run through the config's
 * `fileNamePattern`.
 */
export type Entry = {
  name: string;
  input: string;
};

/**
 * The bundler's typed configuration, replacing
 * vite.config's `lib` + `rollupOptions`. Parsed and
 * validated at the `unknown` boundary by
 * `asBundleConfig` before any build runs.
 */
export type BundleConfig = Readonly<{
  /**
   * The artifact kind (see {@link Target}). Optional in
   * the config file; defaults to `"library"`.
   */
  target: Target;
  /** Package root (absolute). */
  root: string;
  /** Source root under `root` (e.g. "src"). */
  rootDir: string;
  /** Output dir under `root` (e.g. "dist"). */
  outDir: string;
  /** One entry (single-entry) or several (multi). */
  entries: ReadonlyArray<Entry>;
  /** Formats to emit (es and/or cjs). */
  formats: ReadonlyArray<Format>;
  /**
   * Output file-name template with `[name]` and
   * `[format]` placeholders, e.g.
   * `"[name].[format].js"` → `index.es.js` /
   * `index.cjs.js` for the `index` entry,
   * `styleEntry.es.js` for `styleEntry`. Reproduces
   * vite's `index.${format}.js` / `${name}.${format}.js`.
   */
  fileNamePattern: string;
  /**
   * The package self-alias prefix and its source root,
   * e.g. `{ prefix: "plgg", srcRoot: "src" }` so
   * `plgg/Atomics/Num` resolves to `src/Atomics/Num`.
   */
  alias: Readonly<{
    prefix: string;
    srcRoot: string;
  }>;
}>;

/**
 * Apply a {@link BundleConfig#fileNamePattern} to an
 * entry name and format, substituting `[name]` and
 * `[format]`. Pure string templating.
 */
export const applyFileName = (
  pattern: string,
  name: string,
  format: Format,
): string =>
  pattern
    .split("[name]")
    .join(name)
    .split("[format]")
    .join(format);
