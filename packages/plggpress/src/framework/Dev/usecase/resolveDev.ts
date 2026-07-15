import { resolve } from "node:path";
import {
  type SoftStr,
  type Result,
  pipe,
  ok,
  getOr,
  matchOption,
  chainResult,
} from "plgg";
import {
  type Invocation,
  optionOf,
  hasFlag,
} from "plgg-cli";
import { type DevSettings } from "plggpress/framework/Dev/model/DevPlan";
import { asPort } from "plggpress/framework/Cli/usecase/resolveOptions";

/** The dev server's default port when `--port` is absent. */
export const DEFAULT_DEV_PORT = 5173;

/**
 * The conventional content subdirectory a `dev` run adopts
 * when it exists and `--contentDir` is silent. See
 * {@link resolveDev} for why.
 */
export const CONVENTIONAL_CONTENT_DIR: SoftStr =
  "docs";

/**
 * The facts the CLI's I/O edge measured for this run, which
 * {@link resolveDev} may not measure itself: the working
 * directory, the app's defaults, and whether the
 * conventional `docs/` directory exists. Passing them in is
 * what keeps the resolution pure and testable.
 */
export type DevInputs = Readonly<{
  cwd: SoftStr;
  /** Deploy base, from the app's validated config. */
  base: SoftStr;
  /** The app's default config filename (`site.config.ts`). */
  configFile: SoftStr;
  /** Absolute path of the framework-shipped dev entry. */
  entry: SoftStr;
  aliasPrefix: SoftStr;
  appSrcDir: SoftStr;
  /** Extra hosts the app's config allows. */
  configAllowedHosts: ReadonlyArray<SoftStr>;
  /** Whether `<cwd>/docs` is a directory. */
  hasConventionalContentDir: boolean;
}>;

/**
 * The content root for this run.
 *
 * `--contentDir` wins. Otherwise the convention decides:
 * `docs/` when it exists, else the working directory. This
 * is deliberate — the two real consumers disagree (a docs
 * site keeps content in `docs/`; the guide keeps its `.md`
 * at the package root), and defaulting flatly to `.` scans
 * the WHOLE repository, dragging in `.workaholic/`, notes,
 * and other non-content Markdown (a bug hit for real). So:
 * honour `docs/` when the repo has one, fall back to `.`
 * for a root-content layout, and let `--contentDir` settle
 * any case the convention gets wrong.
 */
const contentDirOf = (
  invocation: Invocation,
  inputs: DevInputs,
): SoftStr =>
  pipe(
    optionOf("contentDir")(invocation),
    matchOption(
      (): SoftStr =>
        inputs.hasConventionalContentDir
          ? resolve(
              inputs.cwd,
              CONVENTIONAL_CONTENT_DIR,
            )
          : inputs.cwd,
      (flagged: SoftStr): SoftStr =>
        resolve(inputs.cwd, flagged),
    ),
  );

/**
 * The Host headers the dev server answers: always
 * loopback, plus whatever the app's config allows (a
 * tunnel domain), plus an ad-hoc `--host`. De-duplicated so
 * a repeated host is stated once.
 */
const allowedHostsOf = (
  invocation: Invocation,
  inputs: DevInputs,
): ReadonlyArray<SoftStr> => [
  ...new Set([
    "localhost",
    ...inputs.configAllowedHosts,
    ...pipe(
      optionOf("host")(invocation),
      matchOption(
        (): ReadonlyArray<SoftStr> => [],
        (h: SoftStr): ReadonlyArray<SoftStr> => [
          h,
        ],
      ),
    ),
  ]),
];

/** The port for this run: validated `--port`, else the default. */
const portOf = (
  invocation: Invocation,
): Result<number, SoftStr> =>
  pipe(
    optionOf("port")(invocation),
    matchOption(
      (): Result<number, SoftStr> =>
        ok(DEFAULT_DEV_PORT),
      (raw: SoftStr): Result<number, SoftStr> =>
        asPort(raw),
    ),
  );

/**
 * Resolve one dev run's {@link DevSettings} from the parsed
 * flags and the {@link DevInputs} the edge measured — the
 * pure default-merging step. A bad `--port` short-circuits
 * to a one-line `Err` the CLI prints; nothing throws.
 */
export const resolveDev = (
  invocation: Invocation,
  inputs: DevInputs,
): Result<DevSettings, SoftStr> =>
  pipe(
    portOf(invocation),
    chainResult(
      (
        port: number,
      ): Result<DevSettings, SoftStr> =>
        ok({
          root: inputs.cwd,
          contentDir: contentDirOf(
            invocation,
            inputs,
          ),
          configPath: pipe(
            optionOf("config")(invocation),
            getOr(inputs.configFile),
            (p: SoftStr): SoftStr =>
              resolve(inputs.cwd, p),
          ),
          base: inputs.base,
          entry: inputs.entry,
          aliasPrefix: inputs.aliasPrefix,
          appSrcDir: inputs.appSrcDir,
          port,
          allowedHosts: allowedHostsOf(
            invocation,
            inputs,
          ),
          watchTheme: hasFlag("watch-theme")(
            invocation,
          ),
        }),
    ),
  );
