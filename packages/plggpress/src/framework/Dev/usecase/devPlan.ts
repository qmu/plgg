import { relative } from "node:path";
import { type SoftStr } from "plgg";
import {
  type DevPlan,
  type DevSettings,
} from "plggpress/framework/Dev/model/DevPlan";

/**
 * The output name template the toolchain requires. Inert
 * for a dev run (nothing is emitted), but part of its
 * config shape.
 */
const FILE_NAME_PATTERN: SoftStr =
  "[name].[format].js";

/**
 * Assemble the toolchain {@link DevPlan} from the resolved
 * {@link DevSettings} — the PURE heart of `dev`: flags and
 * defaults in, a complete plan out, no filesystem and no
 * clock. Everything effectful (probing for `docs/`,
 * registering the loader hook, watching, serving) lives at
 * the boundary, so this is the piece the specs pin.
 *
 * Two deliberate decisions are encoded here:
 *
 * 1. **`watch` excludes the theme by default.** A consumer
 *    edits content, not plggpress; watching the theme's
 *    whole source tree would rebuild the module graph on
 *    every save for no benefit. `--watch-theme` opts in for
 *    family co-development.
 * 2. **`sourceAliases` is always empty.** It exists for a
 *    consumer whose config points a foreign package at
 *    source; plggpress does not need it — the `plggpress`
 *    CLI already runs from its own source (its bin
 *    registers the `plggpress/*` → `src/*` resolver at
 *    process entry), so the dev entry ALREADY loads the
 *    theme from source. Which is also why `--watch-theme`
 *    only has to add a watch root: resolution is already
 *    right, only the trigger was missing.
 */
export const devPlanOf = (
  settings: DevSettings,
): DevPlan => ({
  root: settings.root,
  rootDir: ".",
  outDir: "dist",
  fileNamePattern: FILE_NAME_PATTERN,
  // A dev run never builds.
  entries: [],
  formats: ["es"],
  // The app's self-alias, so the toolchain's graph scan can
  // resolve `<prefix>/*` import edges to real files. Stated
  // `root`-relative (the toolchain joins it onto `root`).
  alias: {
    prefix: settings.aliasPrefix,
    srcRoot: relative(
      settings.root,
      settings.appSrcDir,
    ),
  },
  dev: {
    entry: settings.entry,
    port: settings.port,
    watch: settings.watchTheme
      ? [
          settings.contentDir,
          settings.configPath,
          settings.appSrcDir,
        ]
      : [
          settings.contentDir,
          settings.configPath,
        ],
    allowedHosts: settings.allowedHosts,
    sourceAliases: [],
  },
});
