import { type Server } from "node:http";
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
  type Program,
  type Invocation,
  program,
  command,
  option,
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

/**
 * The declaration an app hands the framework to get a
 * pre-organized `build`/`serve` CLI: how to load + validate
 * its config, how to map that config to the app-specific run
 * context (deploy base), the build spec (router factory, 404
 * body, link-check), the served-`Web` factory, and how to
 * render its error union as a one-line shell message. The
 * framework brings all the wiring — argv parsing, command
 * dispatch, the usage banner, and the `Result`→exit-code
 * fold — so an app's `cli.ts` stays a thin declaration.
 *
 * Three modes, ONE config + ONE render path: `build` (SSG),
 * `serve` (a persistent instance for the dynamic subtrees),
 * and — as a toolchain concern, NOT a framework command —
 * `plgg-bundle dev` via the app's `devEntry`. So there is
 * still no `dev` command; `serve` is not its return (no
 * watch, no re-import, config loaded once at startup).
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
   * so served HTML ≡ generated HTML. Required (plggpress is
   * the only consumer, so the shape is not kept
   * backward-compatible).
   */
  serveWeb: (
    config: Config,
    opts: AppOptions,
  ) => PromisedResult<
    (paths: ReadonlyArray<SoftStr>) => Web,
    Defect
  >;
  formatError: (
    e: SsgError | Defect | E,
  ) => SoftStr;
}>;

/** The `--config`/`--contentDir`/`--outDir` flags every
 * command accepts, as plgg-cli value-options. */
const configOptions = [
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
  option(
    "outDir",
    "path",
    "output directory",
  ),
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
            Promise.resolve(err(e.content.message)),
          (
            config: Config,
          ): PromisedResult<SoftStr, SoftStr> => {
            const opts = resolveOptions(
              invocation,
              def.context(config),
            );
            const settings = resolveServe(invocation);
            if (isErr(settings)) {
              return Promise.resolve(
                err(settings.content),
              );
            }
            return def
              .serveWeb(config, opts)
              .then(
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
                    (h: SoftStr): SoftStr => h,
                  )(settings.content.hostname);
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
                      resolve(ok("server stopped")),
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
 * The pre-organized CLI: wire a plgg-cli `build` + `serve`
 * program onto the framework from an {@link AppDefinition},
 * and hand it to plgg-cli's {@link runCli} (which owns argv
 * parsing, dispatch, the usage banner, and the
 * `Result`→exit-code fold). An app's `cli.ts` is then just
 * `await runApp(definition)`. Dev/hot-reload stays a
 * toolchain concern (`plgg-bundle dev`), not the framework's,
 * so there is still no `dev` command — `serve` is the
 * persistent-instance mode (D5), not a dev server.
 */
export const runApp = <Config, E>(
  def: AppDefinition<Config, E>,
): Promise<void> => {
  const app: Program = program(
    def.name,
    def.description,
    [
      command(
        "build",
        "build the site into static files",
        configOptions,
      ),
      command(
        "serve",
        "run a persistent server on the same config",
        serveOptions,
      ),
    ],
  );
  return runCli(app, {
    build: runBuild(def),
    serve: runServe(def),
  });
};
