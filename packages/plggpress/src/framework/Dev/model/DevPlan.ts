import { type SoftStr } from "plgg";

/**
 * A dev-time source-resolution rule handed across the
 * toolchain seam: resolve `<prefix>` / `<prefix>/<sub>`
 * specifiers to `<srcDir>` so a package's source (not its
 * built dist) participates in hot-reload.
 */
export type DevSourceAlias = Readonly<{
  prefix: SoftStr;
  srcDir: SoftStr;
}>;

/**
 * Everything ONE `dev` run was resolved to, after flags,
 * cwd defaults, and the app's validated config have been
 * merged. Pure data — {@link devPlanOf} turns it into the
 * toolchain {@link DevPlan}, and the CLI's I/O edge is the
 * only place it is produced from the real filesystem.
 *
 * - `root` — the consumer's working directory (the plan's
 *   resolution base).
 * - `contentDir` / `configPath` — absolute; the two roots a
 *   default dev run watches.
 * - `base` — the deploy base, from the app's config.
 * - `entry` — absolute path of the dev-entry module the
 *   FRAMEWORK ships (never the consumer's), re-imported on
 *   every reload.
 * - `aliasPrefix` / `appSrcDir` — the app package's
 *   self-alias and its source root, so the toolchain's
 *   module-graph scan can resolve `<prefix>/*` edges.
 * - `watchTheme` — opt-in: also watch `appSrcDir`, for
 *   family co-development of the theme itself.
 */
export type DevSettings = Readonly<{
  root: SoftStr;
  contentDir: SoftStr;
  configPath: SoftStr;
  base: SoftStr;
  entry: SoftStr;
  aliasPrefix: SoftStr;
  appSrcDir: SoftStr;
  port: number;
  allowedHosts: ReadonlyArray<SoftStr>;
  watchTheme: boolean;
}>;

/**
 * One build entry in a {@link DevPlan}. A dev run never
 * builds, so the plan's `entries` is always empty — the
 * type exists only to keep the plan's shape honest rather
 * than degenerating to `never[]`.
 */
export type DevPlanEntry = Readonly<{
  name: SoftStr;
  input: SoftStr;
}>;

/**
 * The configuration plggpress hands the bundling toolchain
 * to start a dev loop — OUR type, not the toolchain's
 * (`anti-corruption-structure`): the seam
 * (`framework/Dev/node/devSeam`) is the only module that
 * knows a toolchain exists, and it passes this plain data
 * across. Structurally this mirrors what a hand-written
 * `bundle.config.ts` used to declare; assembling it in
 * memory is exactly what frees a consumer from writing one.
 *
 * The non-`dev` fields are the toolchain's required config
 * shape. A dev run never builds, so `entries` is empty and
 * `outDir` / `fileNamePattern` are inert.
 */
export type DevPlan = Readonly<{
  root: SoftStr;
  rootDir: SoftStr;
  outDir: SoftStr;
  fileNamePattern: SoftStr;
  entries: ReadonlyArray<DevPlanEntry>;
  formats: ReadonlyArray<SoftStr>;
  alias: Readonly<{
    prefix: SoftStr;
    srcRoot: SoftStr;
  }>;
  dev: Readonly<{
    entry: SoftStr;
    port: number;
    watch: ReadonlyArray<SoftStr>;
    allowedHosts: ReadonlyArray<SoftStr>;
    sourceAliases: ReadonlyArray<DevSourceAlias>;
  }>;
}>;

/**
 * A running dev server: where it is reachable and how to
 * stop it. The narrowed result of the toolchain seam — the
 * ONLY toolchain value that crosses back into plggpress.
 */
export type DevHandle = Readonly<{
  url: SoftStr;
  close: () => void;
}>;
