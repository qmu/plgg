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
 * - `"app"`: the leaf BROWSER application (the `example`
 *   client, the poc demos) — a single self-contained `es`
 *   bundle with every workspace sibling INLINED from source
 *   (the mirror of the library decision: the app is where
 *   bundling deps is correct, since a browser cannot
 *   resolve a bare `import "plgg"`). No `.d.ts` (nothing
 *   consumes it) and only `node:*` stays external.
 * - `"cli"`: a NODE command-line tool (plgg-bundle self-
 *   bundling its own CLI) — a single `es` bundle with the
 *   package's own source INLINED but its declared npm
 *   dependencies AND `node:*` left EXTERNAL (resolved from
 *   node_modules at runtime; a Node process can `import`
 *   them, unlike a browser). No `.d.ts` and no export
 *   surface (a CLI entry has side effects, not exports).
 *   The distinction from `"app"`: a browser app inlines
 *   third-party deps (unresolvable bare specifiers at
 *   runtime), a Node CLI externalizes them.
 */
export type Target = "library" | "app" | "cli";

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
 * The optional `dev` section: everything `plgg-bundle dev`
 * needs to serve + hot-reload an app. Absent for a plain
 * library config (build-only), so existing configs need no
 * change.
 *
 * - `entry` — the app's dev-entry module (absolute or
 *   `root`-relative), default-exporting a `FetchFactory`.
 * - `port` — the port the node:http server binds.
 * - `watch` — source roots (absolute or `root`-relative)
 *   watched for code/content edits.
 * - `allowedHosts` — extra `Host` headers accepted beyond
 *   loopback (e.g. a tunnel domain).
 * - `sourceAliases` — cross-package self-aliases to resolve
 *   to SOURCE during dev, so a dependency's `<prefix>/*`
 *   imports (e.g. a theme package's) load from its `.ts`
 *   and hot-reload, instead of its built dist. Empty for a
 *   self-contained app.
 */
export type DevConfig = Readonly<{
  entry: string;
  port: number;
  watch: ReadonlyArray<string>;
  allowedHosts: ReadonlyArray<string>;
  sourceAliases: ReadonlyArray<SourceAlias>;
}>;

/**
 * A dev-time source resolution rule: resolve `<prefix>`
 * and `<prefix>/<sub>` specifiers to `<srcDir>` /
 * `<srcDir>/<sub>` (`.ts`/`/index.ts`), so a dependency
 * package's source participates in hot-reload.
 */
export type SourceAlias = Readonly<{
  prefix: string;
  srcDir: string;
}>;

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
  /**
   * The dev-server section. Present only for a config that
   * `plgg-bundle dev` serves; a build-only library omits
   * it. See {@link DevConfig}.
   */
  dev?: DevConfig;
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
