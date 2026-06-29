import { resolve } from "node:path";
import {
  type SoftStr,
  type Option,
  type Defect,
  none,
  fromNullable,
  pipe,
  getOr,
  matchResult,
} from "plgg";
import { type SsgError } from "plgg-server/ssg";
import {
  type SiteConfig,
} from "plgg-press/SiteConfig/model/SiteConfig";
import {
  type PressOptions,
  type BuildReport,
  type DevServer,
} from "plgg-press/Press/model/PressOptions";
import { type ConfigLoadError } from "plgg-press/Press/model/PressError";
import {
  type BrokenLink,
  type BrokenLinks,
} from "plgg-press/CheckLinks/model/CheckLinks";
import { loadConfig } from "plgg-press/Config/usecase/loadConfig";
import { build } from "plgg-press/build";
import { dev } from "plgg-press/dev";

/**
 * The CLI usage banner.
 */
const USAGE = `plgg-press — static site generator

Usage:
  plgg-press build [--config <path>] [--contentDir <path>] [--outDir <path>]
  plgg-press dev   [--config <path>] [--contentDir <path>] [--outDir <path>]
`;

/**
 * Write a line to stdout.
 */
const print = (message: SoftStr): void => {
  process.stdout.write(`${message}\n`);
};

/**
 * Report an error to stderr and set a non-zero exit
 * code — the single place a Result `Err` becomes a shell
 * failure.
 */
const fail = (message: SoftStr): void => {
  process.stderr.write(
    `plgg-press: ${message}\n`,
  );
  process.exitCode = 1;
};

/**
 * Read the value following a `--<name>` flag, if present.
 */
const flag = (
  argv: ReadonlyArray<SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  pipe(
    argv.indexOf(`--${name}`),
    (i: number): Option<SoftStr> =>
      i >= 0
        ? fromNullable(argv[i + 1])
        : none(),
  );

/**
 * Resolve {@link PressOptions} from cwd defaults, the
 * parsed flags, and the loaded config.
 */
const optionsFrom = (
  argv: ReadonlyArray<SoftStr>,
  config: SiteConfig,
  devRun: boolean,
): PressOptions => {
  const cwd = process.cwd();
  const contentDir = pipe(
    flag(argv, "contentDir"),
    getOr(cwd),
  );
  return {
    contentDir,
    outDir: pipe(
      flag(argv, "outDir"),
      getOr(resolve(cwd, "dist")),
    ),
    assetsDir: resolve(contentDir, "public"),
    config,
    base: config.base,
    dev: devRun,
    allowedHosts: config.dev.allowedHosts,
  };
};

/**
 * The config path for this run: `--config <path>` or the
 * cwd default.
 */
const configPathOf = (
  argv: ReadonlyArray<SoftStr>,
): SoftStr =>
  pipe(
    flag(argv, "config"),
    getOr(resolve(process.cwd(), "site.config.ts")),
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
 * `build` dispatch: load the config, then run the build,
 * folding both error channels to the shell.
 */
const runBuild = (
  argv: ReadonlyArray<SoftStr>,
): Promise<void> =>
  loadConfig(configPathOf(argv)).then(
    matchResult(
      (e: ConfigLoadError): Promise<void> =>
        Promise.resolve(
          fail(e.content.message),
        ),
      (config: SiteConfig): Promise<void> =>
        build(
          optionsFrom(argv, config, false),
        ).then(
          matchResult(
            (
              be: SsgError | Defect | BrokenLinks,
            ): void =>
              fail(formatBuildError(be)),
            (r: BuildReport): void =>
              print(
                `built ${r.pages.length} page(s) to ${r.outDir}`,
              ),
          ),
        ),
    ),
  );

/**
 * `dev` dispatch: load the config, then start the dev
 * server, folding both error channels to the shell.
 */
const runDev = (
  argv: ReadonlyArray<SoftStr>,
): Promise<void> =>
  loadConfig(configPathOf(argv)).then(
    matchResult(
      (e: ConfigLoadError): Promise<void> =>
        Promise.resolve(
          fail(e.content.message),
        ),
      (config: SiteConfig): Promise<void> =>
        dev(
          optionsFrom(argv, config, true),
        ).then(
          matchResult(
            (de: SsgError): void =>
              fail(formatBuildError(de)),
            (s: DevServer): void =>
              print(
                `dev server at ${s.url}`,
              ),
          ),
        ),
    ),
  );

/**
 * Dispatch on the first positional argument:
 * `build` → build, `dev` → dev, anything else → usage.
 */
const main = (): Promise<void> => {
  const argv = process.argv.slice(2);
  const command = argv[0];
  return command === "build"
    ? runBuild(argv)
    : command === "dev"
      ? runDev(argv)
      : Promise.resolve(print(USAGE));
};

await main();
