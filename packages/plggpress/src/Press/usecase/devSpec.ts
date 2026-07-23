import { join } from "node:path";
import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  ok,
  err,
  matchResult,
} from "plgg";
import {
  type DevDefinition,
  type ConfigLoadError,
} from "plggpress/framework";
import { type SsgError } from "plggpress/framework/ssg";
import {
  type DevSettings,
  type DevHandle,
} from "plggpress/framework/Dev/model/DevPlan";
import { srcRootOf } from "plggpress/framework/Dev/usecase/appSource";
import {
  type DevServerHandle,
  startDevServer,
} from "plggpress/framework/DevServer/node/devServer";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";

/**
 * plggpress's own source root, found from THIS module's
 * location on disk (see {@link srcRootOf}) — never from the
 * consumer's directory. This is what lets `plggpress dev`
 * run in a repository that has only ever heard of
 * `plggpress`: the theme's whereabouts are the CLI's own
 * business, not a path a consumer must configure.
 */
const SRC_ROOT: SoftStr = srcRootOf(
  import.meta.url,
);

/**
 * The source paths one dev run watches: content + config
 * always, plus plggpress's own source when the writer opts
 * into theme co-development (`--watch-theme`). A change on
 * any watched path fires the dev server's watcher, which
 * pushes a reload down the plggpress-owned channel.
 */
const watchPathsOf = (
  settings: DevSettings,
): ReadonlyArray<SoftStr> =>
  settings.watchTheme
    ? [
        settings.contentDir,
        settings.configPath,
        settings.appSrcDir,
      ]
    : [settings.contentDir, settings.configPath];

/**
 * Render a dev-server startup failure — a config-load, a
 * route-discovery, or an infrastructural `Defect` — as the
 * one-line shell message the CLI prints. Narrows on `__tag`
 * (no cast); every variant surfaces its most useful field.
 */
const startupMessageOf = (
  e: ConfigLoadError | SsgError | Defect,
): SoftStr =>
  e.__tag === "ConfigLoadError"
    ? e.content.message
    : e.__tag === "Defect"
      ? e.content.message
      : `dev server could not start — ${e.__tag} at ${e.content.path}`;

/**
 * Start `plggpress dev`'s persistent surface — the
 * plggpress-OWNED server ({@link startDevServer}): the
 * shared render path wrapped in the live-reload channel and
 * the live-edit bridge, watching the resolved source paths.
 * A startup failure folds to the shell `Err` channel; on a
 * clean listen it hands back the narrowed {@link DevHandle}
 * the framework holds the process on.
 */
const runPressDev = (
  settings: DevSettings,
): PromisedResult<DevHandle, SoftStr> =>
  startDevServer({
    contentDir: settings.contentDir,
    configPath: settings.configPath,
    base: settings.base,
    watch: watchPathsOf(settings),
    port: settings.port,
  }).then(
    matchResult(
      (
        e: ConfigLoadError | SsgError | Defect,
      ): Result<DevHandle, SoftStr> =>
        err(startupMessageOf(e)),
      (
        handle: DevServerHandle,
      ): Result<DevHandle, SoftStr> =>
        ok({
          url: handle.url,
          close: (): void => {
            void handle.close();
          },
        }),
    ),
  );

/**
 * The press `dev` declaration: plggpress SERVES its own
 * persistent dev surface (`framework/DevServer`), not the
 * bundler's — a self-owned live-reload channel plus the
 * live-edit bridge mounted at the process root, so a tool
 * call can patch the open markdown and the page hot-reloads
 * in place while the channel stays connected.
 *
 * `entry`/`aliasPrefix`/`srcDir` still describe the app's
 * own source location so the framework can resolve the
 * watch roots; `run` is the plggpress-owned start seam
 * ({@link runPressDev}), not a toolchain delegate. The
 * whole hand-wiring a consumer once kept
 * (`bundle.config.ts` + `devEntry.ts` + a bundler
 * dependency) is still gone — a bare docs repo runs
 * `plggpress dev` with no wiring, now over plggpress's own
 * surface.
 */
export const pressDevOf =
  (): DevDefinition<SiteConfig> => ({
    entry: join(SRC_ROOT, "devServerEntry.ts"),
    aliasPrefix: "plggpress",
    srcDir: SRC_ROOT,
    allowedHosts: (
      config: SiteConfig,
    ): ReadonlyArray<SoftStr> =>
      config.dev.allowedHosts,
    run: runPressDev,
  });
