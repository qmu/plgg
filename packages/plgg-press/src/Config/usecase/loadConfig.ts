import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type SoftStr,
  type PromisedResult,
  type Result,
  type InvalidError,
  ok,
  err,
  pipe,
  matchResult,
} from "plgg";
import {
  type SiteConfig,
  defineSite,
} from "plgg-press/SiteConfig/model/SiteConfig";
import {
  type ConfigLoadError,
  configLoadError,
} from "plgg-press/Press/model/PressError";

/**
 * Extract a module's `default` export, tolerating a
 * module that is itself the config object.
 */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  "default" in mod
    ? mod.default
    : mod;

/**
 * Validate an imported config value into a
 * {@link SiteConfig}, lifting a validation miss into a
 * {@link ConfigLoadError} that carries the underlying
 * cause.
 */
const validate = (
  path: SoftStr,
  value: unknown,
): Result<SiteConfig, ConfigLoadError> =>
  pipe(
    defineSite(value),
    matchResult(
      (
        e: InvalidError,
      ): Result<SiteConfig, ConfigLoadError> =>
        err(
          configLoadError({
            message: `invalid config at ${path}: ${e.content.message}`,
            cause: e,
          }),
        ),
      (
        cfg: SiteConfig,
      ): Result<SiteConfig, ConfigLoadError> =>
        ok(cfg),
    ),
  );

/**
 * Load and validate the consumer's `site.config` from a
 * path. The TS source is loaded through the dynamic
 * `import` Node strips types on (the same hook the bin
 * registers), so no separate transpile step is needed.
 * A missing file or an import-time throw becomes a typed
 * {@link ConfigLoadError} — config loading never throws.
 */
export const loadConfig = (
  path: SoftStr,
): PromisedResult<
  SiteConfig,
  ConfigLoadError
> =>
  import(
    pathToFileURL(resolve(path)).href
  ).then(
    (mod: unknown) =>
      validate(path, pickDefault(mod)),
    (reason: unknown) =>
      err(
        configLoadError({
          message: `failed to load config at ${path}: ${
            reason instanceof Error
              ? reason.message
              : String(reason)
          }`,
        }),
      ),
  );
