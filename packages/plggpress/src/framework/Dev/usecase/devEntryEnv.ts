import {
  type SoftStr,
  type Result,
  ok,
  err,
} from "plgg";
import { type DevSettings } from "plggpress/framework/Dev/model/DevPlan";

/**
 * What the framework's dev-entry module needs to build the
 * render `Fetch`: the content root, the config path, and
 * the deploy base — the same three a hand-written
 * `devEntry.ts` used to close over.
 */
export type DevEntryEnv = Readonly<{
  contentDir: SoftStr;
  configPath: SoftStr;
  base: SoftStr;
}>;

/**
 * The environment-variable names carrying {@link
 * DevEntryEnv} across the reload boundary.
 *
 * Why the environment and not a closure: the toolchain
 * hot-reloads by RE-IMPORTING the dev entry from a path, so
 * the entry is a module, not a function the `dev` command
 * can hand arguments to. The command therefore ships the
 * module (that is the whole point — a consumer writes no
 * `devEntry.ts`) and passes its options through the one
 * channel a re-imported module can still read: this
 * process's own environment, which the command sets once
 * before the first import and every reload sees again.
 */
export const DEV_ENV: Readonly<{
  contentDir: SoftStr;
  configPath: SoftStr;
  base: SoftStr;
}> = {
  contentDir: "PLGGPRESS_DEV_CONTENT_DIR",
  configPath: "PLGGPRESS_DEV_CONFIG",
  base: "PLGGPRESS_DEV_BASE",
};

/**
 * The environment the `dev` command exports for its
 * dev-entry module. Pure: settings in, variables out — the
 * caller does the assigning.
 */
export const devEntryEnvOf = (
  settings: DevSettings,
): Readonly<Record<string, string>> => ({
  [DEV_ENV.contentDir]: settings.contentDir,
  [DEV_ENV.configPath]: settings.configPath,
  [DEV_ENV.base]: settings.base,
});

/**
 * Read {@link DevEntryEnv} back out of an environment, or
 * `Err` naming the first variable the `dev` command should
 * have set. An `Err` here means the entry module was
 * imported by something other than `plggpress dev`.
 */
export const devEntryEnvFrom = (
  env: Readonly<
    Record<string, string | undefined>
  >,
): Result<DevEntryEnv, SoftStr> => {
  const contentDir = env[DEV_ENV.contentDir];
  const configPath = env[DEV_ENV.configPath];
  const base = env[DEV_ENV.base];
  return contentDir === undefined
    ? missing(DEV_ENV.contentDir)
    : configPath === undefined
      ? missing(DEV_ENV.configPath)
      : base === undefined
        ? missing(DEV_ENV.base)
        : ok({ contentDir, configPath, base });
};

/** The one-line message a missing dev variable produces. */
const missing = (
  name: SoftStr,
): Result<DevEntryEnv, SoftStr> =>
  err(
    `${name} is not set — this module is the dev entry of \`plggpress dev\` and is not meant to be imported directly`,
  );
