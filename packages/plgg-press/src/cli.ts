import { resolve } from "node:path";
import {
  type SoftStr,
  type Defect,
  type Result,
  type PromisedResult,
  ok,
  err,
  pipe,
  getOr,
  matchResult,
} from "plgg";
import {
  type Program,
  type Invocation,
  program,
  command,
  option,
  optionOf,
  runCli,
} from "plgg-cli";
import { type SsgError } from "plgg-server/ssg";
import {
  type SiteConfig,
} from "plgg-press/SiteConfig/model/SiteConfig";
import {
  type PressOptions,
  type BuildReport,
} from "plgg-press/Press/model/PressOptions";
import { type ConfigLoadError } from "plgg-press/Press/model/PressError";
import {
  type BrokenLink,
  type BrokenLinks,
} from "plgg-press/CheckLinks/model/CheckLinks";
import { loadConfig } from "plgg-press/Config/usecase/loadConfig";
import { build } from "plgg-press/build";

/**
 * The `site.config.ts` flags every command accepts, as
 * plgg-cli value-options.
 */
const configOptions = [
  option(
    "config",
    "path",
    "path to site.config.ts",
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
 * Resolve {@link PressOptions} from cwd defaults, the
 * parsed invocation, and the loaded config.
 */
const optionsFrom = (
  invocation: Invocation,
  config: SiteConfig,
): PressOptions => {
  const cwd = process.cwd();
  const contentDir = pipe(
    optionOf("contentDir")(invocation),
    getOr(cwd),
  );
  return {
    contentDir,
    outDir: pipe(
      optionOf("outDir")(invocation),
      getOr(resolve(cwd, "dist")),
    ),
    assetsDir: resolve(contentDir, "public"),
    config,
    base: config.base,
  };
};

/**
 * The config path for this run: `--config <path>` or the
 * cwd default.
 */
const configPathOf = (
  invocation: Invocation,
): SoftStr =>
  pipe(
    optionOf("config")(invocation),
    getOr(
      resolve(process.cwd(), "site.config.ts"),
    ),
  );

/**
 * Renders a build failure as a one-line shell message. The
 * tagged `SsgError`/`Defect` union narrows on `__tag` — no
 * cast — so each variant surfaces its most useful field.
 */
const formatBuildError = (
  e: SsgError | Defect | BrokenLinks,
): SoftStr =>
  e.__tag === "Defect"
    ? e.content.message
    : e.__tag === "BrokenLinks"
      ? `${e.content.broken.length} broken link(s): ${e.content.broken
          .map(
            (b: BrokenLink): SoftStr =>
              `${b.source} -> ${b.href} (${b.reason})`,
          )
          .join("; ")}`
      : e.__tag === "WriteFailed"
        ? `${e.content.path}: ${e.content.message}`
        : `${e.__tag}: ${e.content.path}`;

/**
 * `build` handler: load the config, then run the build,
 * folding both error channels to a shell outcome — an
 * `Err` message becomes stderr + a non-zero exit, an `Ok`
 * message becomes a stdout line.
 */
const runBuild = (
  invocation: Invocation,
): PromisedResult<SoftStr, SoftStr> =>
  loadConfig(configPathOf(invocation)).then(
    matchResult(
      (
        e: ConfigLoadError,
      ): PromisedResult<SoftStr, SoftStr> =>
        Promise.resolve(err(e.content.message)),
      (
        config: SiteConfig,
      ): PromisedResult<SoftStr, SoftStr> =>
        build(
          optionsFrom(invocation, config),
        ).then(
          matchResult(
            (
              be:
                | SsgError
                | Defect
                | BrokenLinks,
            ): Result<SoftStr, SoftStr> =>
              err(formatBuildError(be)),
            (
              r: BuildReport,
            ): Result<SoftStr, SoftStr> =>
              ok(
                `built ${r.pages.length} page(s) to ${r.outDir}`,
              ),
          ),
        ),
    ),
  );

/**
 * The plgg-press program: `build` takes the shared config
 * flags. Argv parsing, command dispatch, the usage banner,
 * and the `Result`→exit-code fold are all owned by
 * plgg-cli's {@link runCli}. Dev/hot-reload is a toolchain
 * concern now — `plgg-bundle dev` serves the site (see
 * `devEntry`), so plgg-press ships no `dev` command.
 */
const app: Program = program(
  "plgg-press",
  "static site generator",
  [
    command(
      "build",
      "build the site into static files",
      configOptions,
    ),
  ],
);

await runCli(app, {
  build: runBuild,
});
