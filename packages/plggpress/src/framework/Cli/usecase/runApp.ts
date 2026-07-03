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
  type Program,
  type Invocation,
  program,
  command,
  option,
  runCli,
} from "plgg-cli";
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
} from "plggpress/framework/Cli/usecase/resolveOptions";

/**
 * The declaration an app hands the framework to get a
 * pre-organized `build`/`dev` CLI: how to load + validate
 * its config, how to map that config to the app-specific
 * run context (deploy base + dev hosts) and the build/dev
 * specs (router factory, 404 body, link-check), and how to
 * render its error union as a one-line shell message. The
 * framework brings all the wiring — argv parsing, command
 * dispatch, the usage banner, and the `Result`→exit-code
 * fold — so an app's `cli.ts` stays a thin declaration.
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
 * The pre-organized CLI: wire a plgg-cli `build` program
 * onto the framework build from an {@link AppDefinition},
 * and hand it to plgg-cli's {@link runCli} (which owns argv
 * parsing, dispatch, the usage banner, and the
 * `Result`→exit-code fold). An app's `cli.ts` is then just
 * `await runApp(definition)`. Dev/hot-reload is a toolchain
 * concern (`plgg-bundle dev`), not the framework's, so
 * there is no `dev` command.
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
    ],
  );
  return runCli(app, {
    build: runBuild(def),
  });
};
