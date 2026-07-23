import { type Server } from "node:http";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  ok,
  err,
  isErr,
  matchResult,
  matchOption,
} from "plgg";
import {
  type Invocation,
  program,
  command,
  option,
  flag,
  runCli,
} from "plgg-cli";
import { type Web } from "plgg-server";
import { type SsgError } from "plgg-server/ssg";
import {
  type AppOptions,
  type BuildReport,
} from "plggpress/framework/App/model/AppOptions";
import { type ConfigLoadError } from "plggpress/framework/App/model/AppError";
import {
  type BuildSpec,
  build,
} from "plggpress/framework/Build/usecase/build";
import {
  type AppRunContext,
  configPathOf,
  resolveOptions,
  resolveServe,
} from "plggpress/framework/Cli/usecase/resolveOptions";
import { serveApp } from "plggpress/framework/Serve/usecase/serveApp";
import {
  type DevSettings,
  type DevPlan,
  type DevHandle,
} from "plggpress/framework/Dev/model/DevPlan";
import {
  DEFAULT_DEV_PORT,
  CONVENTIONAL_CONTENT_DIR,
  resolveDev,
} from "plggpress/framework/Dev/usecase/resolveDev";
import { devPlanOf } from "plggpress/framework/Dev/usecase/devPlan";
import { devEntryEnvOf } from "plggpress/framework/Dev/usecase/devEntryEnv";

/**
 * What an app supplies to get a `dev` command. Optional: an
 * app that declares no `dev` gets no `dev` verb, exactly as
 * `serveWeb` gates `serve`.
 *
 * - `entry` — the absolute path of the dev-entry module the
 *   APP ships (plggpress: `src/devServerEntry.ts`). The
 *   framework never asks a consumer for one.
 * - `aliasPrefix` / `srcDir` — the app package's self-alias
 *   and source root, resolved from the running CLI's own
 *   location so a consumer never names the framework's
 *   checkout.
 * - `allowedHosts` — the extra Host headers this app's
 *   validated config permits (e.g. a tunnel domain). Keeps
 *   the framework free of any app config type.
 * - `run` — the toolchain seam that actually starts the
 *   loop. INJECTED rather than imported: the framework
 *   assembles a {@link DevPlan} and knows nothing about who
 *   runs it, so the only module naming `plgg-bundle`
 *   (`framework/Dev/node/devSeam`) is reached from the
 *   composition root (`cli.ts`) and stays OFF this
 *   package's built surface. That is not just tidiness —
 *   the seam registers a loader hook via `import.meta`,
 *   which is a syntax error when the bundler evaluates a
 *   built entry's module graph to read its exports.
 */
export type DevDefinition<Config> = Readonly<{
  entry: SoftStr;
  aliasPrefix: SoftStr;
  srcDir: SoftStr;
  allowedHosts: (
    config: Config,
  ) => ReadonlyArray<SoftStr>;
  run: (plan: DevPlan) => Promise<DevHandle>;
}>;

/**
 * The declaration an app hands the framework to get a
 * pre-organized `build`/`serve`/`dev` CLI: how to load +
 * validate its config, how to map that config to the
 * app-specific run context (deploy base), the build spec
 * (router factory, 404 body, link-check), the served-`Web`
 * factory, the dev declaration, and how to render its error
 * union as a one-line shell message. The framework brings
 * all the wiring — argv parsing, command dispatch, the usage
 * banner, and the `Result`→exit-code fold — so an app's
 * `cli.ts` stays a thin declaration.
 *
 * Three modes, ONE config + ONE render path: `build` (SSG),
 * `serve` (a persistent instance for the dynamic subtrees),
 * and `dev` (authoring hot-reload). `dev` was once left to
 * the toolchain (`plgg-bundle dev` against a config and an
 * entry the CONSUMER wrote) and is now a framework command:
 * the wiring it needed was always derivable from the app's
 * own declaration plus a few flags, and making the consumer
 * hand-write it was pure friction. The framework still does
 * not OWN the dev loop — it assembles a plan and delegates
 * across `framework/Dev/node/devSeam` — it just stops making
 * the consumer do the assembling.
 *
 * `serve` is not `dev`'s return: it never watches or
 * re-imports, and loads config once at startup.
 */
export type AppDefinition<Config, E> = Readonly<{
  name: SoftStr;
  description: SoftStr;
  /** default config filename (e.g. `site.config.ts`). */
  configFile: SoftStr;
  loadConfig: (
    path: SoftStr,
  ) => PromisedResult<Config, ConfigLoadError>;
  context: (config: Config) => AppRunContext;
  buildSpec: (
    config: Config,
    opts: AppOptions,
  ) => BuildSpec<E>;
  /**
   * The router factory the `serve` verb runs as a persistent
   * process — the SAME factory shape `build` renders through,
   * so served HTML ≡ generated HTML. OPTIONAL: a pure static-
   * site generator (plggpress) omits it and gets a `build`-only
   * CLI; a dynamic consumer (plgg-cms) supplies it to add the
   * `serve` verb. When absent, the `serve` command is not
   * registered at all.
   */
  serveWeb?: (
    config: Config,
    opts: AppOptions,
  ) => PromisedResult<
    (paths: ReadonlyArray<SoftStr>) => Web,
    Defect
  >;
  /**
   * The `dev` (authoring hot-reload) declaration. OPTIONAL,
   * like {@link AppDefinition#serveWeb}: when absent the
   * `dev` command is not registered at all. See
   * {@link DevDefinition}.
   */
  dev?: DevDefinition<Config>;
  formatError: (
    e: SsgError | Defect | E,
  ) => SoftStr;
}>;

/** The `--config`/`--contentDir` flags EVERY command
 * accepts (every mode reads the same config and the same
 * content), as plgg-cli value-options. */
const sourceOptions = [
  option(
    "config",
    "path",
    "path to the app config file",
  ),
  option(
    "contentDir",
    "path",
    "content source directory",
  ),
];

/** The source flags plus `--outDir`, for the commands that
 * WRITE (`build`) — `dev` never emits, so it does not offer
 * an output directory. */
const configOptions = [
  ...sourceOptions,
  option("outDir", "path", "output directory"),
];

/**
 * `build` handler: load the config, then run the framework
 * build, folding both error channels to a shell outcome —
 * an `Err` becomes stderr + a non-zero exit, an `Ok`
 * becomes a stdout line.
 */
const runBuild =
  <Config, E>(def: AppDefinition<Config, E>) =>
  (
    invocation: Invocation,
  ): PromisedResult<SoftStr, SoftStr> =>
    def
      .loadConfig(
        configPathOf(invocation, def.configFile),
      )
      .then(
        matchResult(
          (
            e: ConfigLoadError,
          ): PromisedResult<SoftStr, SoftStr> =>
            Promise.resolve(
              err(e.content.message),
            ),
          (
            config: Config,
          ): PromisedResult<SoftStr, SoftStr> => {
            const opts = resolveOptions(
              invocation,
              def.context(config),
            );
            return build(
              opts,
              def.buildSpec(config, opts),
            ).then(
              matchResult(
                (
                  be: SsgError | Defect | E,
                ): Result<SoftStr, SoftStr> =>
                  err(def.formatError(be)),
                (
                  r: BuildReport,
                ): Result<SoftStr, SoftStr> =>
                  ok(
                    `built ${r.pages.length} page(s) to ${r.outDir}`,
                  ),
              ),
            );
          },
        ),
      );

/**
 * `serve` handler: load the config, resolve the shared
 * options + the serve settings (`--port`/`--hostname`), then
 * start the persistent server on the app's `serveWeb`
 * factory. A config/port error folds to a shell `Err`; on a
 * clean listen it prints ONE startup line and returns a
 * Promise that stays pending until the server `close`s — so
 * the process is held alive by the running server, and
 * plgg-cli's `Result`→exit-code fold is not tricked into
 * exiting early (it resolves `ok` only on `close`/signal).
 */
const runServe =
  <Config, E>(
    def: AppDefinition<Config, E>,
    serveWeb: NonNullable<
      AppDefinition<Config, E>["serveWeb"]
    >,
  ) =>
  (
    invocation: Invocation,
  ): PromisedResult<SoftStr, SoftStr> =>
    def
      .loadConfig(
        configPathOf(invocation, def.configFile),
      )
      .then(
        matchResult(
          (
            e: ConfigLoadError,
          ): PromisedResult<SoftStr, SoftStr> =>
            Promise.resolve(
              err(e.content.message),
            ),
          (
            config: Config,
          ): PromisedResult<SoftStr, SoftStr> => {
            const opts = resolveOptions(
              invocation,
              def.context(config),
            );
            const settings =
              resolveServe(invocation);
            if (isErr(settings)) {
              return Promise.resolve(
                err(settings.content),
              );
            }
            return serveWeb(config, opts).then(
              matchResult(
                (
                  d: Defect,
                ): PromisedResult<
                  SoftStr,
                  SoftStr
                > =>
                  Promise.resolve(
                    err(def.formatError(d)),
                  ),
                (
                  router: (
                    paths: ReadonlyArray<SoftStr>,
                  ) => Web,
                ): PromisedResult<
                  SoftStr,
                  SoftStr
                > =>
                  serveApp(
                    opts,
                    router,
                    settings.content,
                  ).then(
                    matchResult(
                      (
                        se: SsgError | Defect,
                      ): PromisedResult<
                        SoftStr,
                        SoftStr
                      > =>
                        Promise.resolve(
                          err(
                            def.formatError(se),
                          ),
                        ),
                      (
                        server: Server,
                      ): PromisedResult<
                        SoftStr,
                        SoftStr
                      > => {
                        const host = matchOption(
                          () => "localhost",
                          (h: SoftStr): SoftStr =>
                            h,
                        )(
                          settings.content
                            .hostname,
                        );
                        // one startup line; the server holds the
                        // event loop, so this promise stays pending
                        // until close (never, in normal operation)
                        console.log(
                          `serving ${opts.contentDir} on http://${host}:${settings.content.port}${opts.base}`,
                        );
                        return new Promise<
                          Result<SoftStr, SoftStr>
                        >((resolve) => {
                          server.on("close", () =>
                            resolve(
                              ok(
                                "server stopped",
                              ),
                            ),
                          );
                        });
                      },
                    ),
                  ),
              ),
            );
          },
        ),
      );

/**
 * `dev` handler: load the config (the same one `build`
 * reads — a broken config fails here, not in the browser),
 * resolve the settings, assemble the plan, publish the dev
 * entry's environment, and start the loop across the
 * toolchain seam.
 *
 * The shape mirrors {@link runServe}: one startup line, then
 * a promise that never resolves, so the running server holds
 * the process and plgg-cli's `Result`→exit-code fold is not
 * tricked into exiting early.
 *
 * Everything effectful is HERE (cwd, the `docs/` probe,
 * mutating `process.env`, the seam); the resolution and the
 * plan are pure functions this only calls.
 */
const runDev =
  <Config, E>(
    def: AppDefinition<Config, E>,
    dev: DevDefinition<Config>,
  ) =>
  (
    invocation: Invocation,
  ): PromisedResult<SoftStr, SoftStr> =>
    def
      .loadConfig(
        configPathOf(invocation, def.configFile),
      )
      .then(
        matchResult(
          (
            e: ConfigLoadError,
          ): PromisedResult<SoftStr, SoftStr> =>
            Promise.resolve(
              err(e.content.message),
            ),
          (
            config: Config,
          ): PromisedResult<SoftStr, SoftStr> => {
            const cwd = process.cwd();
            const settings = resolveDev(
              invocation,
              {
                cwd,
                base: def.context(config).base,
                configFile: def.configFile,
                entry: dev.entry,
                aliasPrefix: dev.aliasPrefix,
                appSrcDir: dev.srcDir,
                configAllowedHosts:
                  dev.allowedHosts(config),
                hasConventionalContentDir:
                  isDirectory(
                    resolve(
                      cwd,
                      CONVENTIONAL_CONTENT_DIR,
                    ),
                  ),
              },
            );
            if (isErr(settings)) {
              return Promise.resolve(
                err(settings.content),
              );
            }
            return startDev(
              settings.content,
              dev.run,
            );
          },
        ),
      );

/**
 * Publish the dev entry's environment and start the loop.
 * The env assignment is the deliberate mutation the reload
 * seam is built on: the entry module is re-imported, not
 * re-called, so this process's environment is what carries
 * its options across every reload.
 */
const startDev = (
  settings: DevSettings,
  run: (plan: DevPlan) => Promise<DevHandle>,
): PromisedResult<SoftStr, SoftStr> => {
  Object.entries(devEntryEnvOf(settings)).forEach(
    ([key, value]: [string, string]): void => {
      process.env[key] = value;
    },
  );
  return run(devPlanOf(settings))
    .then(
      (
        server: DevHandle,
      ): PromisedResult<SoftStr, SoftStr> => {
        console.log(
          `dev serving ${settings.contentDir} on ${server.url} (hot reload)`,
        );
        // The server holds the event loop; never resolves.
        return new Promise<
          Result<SoftStr, SoftStr>
        >(() => {});
      },
    )
    .catch(
      (
        reason: unknown,
      ): Result<SoftStr, SoftStr> =>
        err(
          reason instanceof Error
            ? reason.message
            : String(reason),
        ),
    );
};

/** Whether a path exists and is a directory. */
const isDirectory = (path: SoftStr): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/**
 * The flags `dev` adds on top of the shared
 * {@link configOptions}: where to listen, an extra allowed
 * Host, and the theme-source opt-in.
 */
const devOptions = [
  ...sourceOptions,
  option(
    "port",
    "number",
    `TCP port to listen on (default ${DEFAULT_DEV_PORT})`,
  ),
  option(
    "host",
    "host",
    "an extra Host header to accept (e.g. a tunnel domain)",
  ),
  flag(
    "watch-theme",
    "also watch the theme's source (for co-developing the theme itself)",
  ),
];

/**
 * The `--port`/`--hostname` flags the `serve` command adds on
 * top of the shared {@link configOptions}. Per-environment
 * operational values, kept off `SiteConfig` (D5).
 */
const serveOptions = [
  ...configOptions,
  option(
    "port",
    "number",
    "TCP port to listen on (default 3000)",
  ),
  option(
    "hostname",
    "host",
    "hostname to bind (default: all interfaces)",
  ),
];

/**
 * The pre-organized CLI: wire a plgg-cli program onto the
 * framework from an {@link AppDefinition}, and hand it to
 * plgg-cli's {@link runCli} (which owns argv parsing,
 * dispatch, the usage banner, and the `Result`→exit-code
 * fold). An app's `cli.ts` is then just
 * `await runApp(definition)`.
 *
 * `build` is always registered; `serve` and `dev` are each
 * registered only when the app declares them
 * ({@link AppDefinition#serveWeb} /
 * {@link AppDefinition#dev}), so a pure static-site
 * generator still gets a `build`+`dev` CLI and no `serve`.
 * `serve` remains the persistent-instance mode (D5) — it is
 * NOT `dev`.
 */
export const runApp = <Config, E>(
  def: AppDefinition<Config, E>,
): Promise<void> => {
  const serveWeb = def.serveWeb;
  const dev = def.dev;
  const commands = [
    command(
      "build",
      "build the site into static files",
      configOptions,
    ),
    ...(serveWeb === undefined
      ? []
      : [
          command(
            "serve",
            "run a persistent server on the same config",
            serveOptions,
          ),
        ]),
    ...(dev === undefined
      ? []
      : [
          command(
            "dev",
            "serve the site with hot reload while authoring",
            devOptions,
          ),
        ]),
  ];
  return runCli(
    program(def.name, def.description, commands),
    {
      build: runBuild(def),
      ...(serveWeb === undefined
        ? {}
        : { serve: runServe(def, serveWeb) }),
      ...(dev === undefined
        ? {}
        : { dev: runDev(def, dev) }),
    },
  );
};
