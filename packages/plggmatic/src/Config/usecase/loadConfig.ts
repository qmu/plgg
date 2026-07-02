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
  type ConfigLoadError,
  configLoadError,
} from "plggmatic/App/model/AppError";

/**
 * Extract a module's `default` export, tolerating a module
 * that is itself the config object.
 */
const pickDefault = (mod: unknown): unknown =>
  typeof mod === "object" &&
  mod !== null &&
  "default" in mod
    ? mod.default
    : mod;

/**
 * Validate an imported config value through the
 * caller-supplied `cast`, lifting a validation miss into a
 * {@link ConfigLoadError} that carries the underlying
 * cause. Generic over the app's config type `T`.
 */
const validate = <T>(
  path: SoftStr,
  cast: (
    value: unknown,
  ) => Result<T, InvalidError>,
  value: unknown,
): Result<T, ConfigLoadError> =>
  pipe(
    cast(value),
    matchResult(
      (
        e: InvalidError,
      ): Result<T, ConfigLoadError> =>
        err(
          configLoadError({
            message: `invalid config at ${path}: ${e.content.message}`,
            cause: e,
          }),
        ),
      (cfg: T): Result<T, ConfigLoadError> =>
        ok(cfg),
    ),
  );

/**
 * Load and validate the consumer app's config module from
 * a path, through the app-supplied boundary `cast`. The TS
 * source is loaded through the dynamic `import` Node strips
 * types on (the same hook the app's bin registers), so no
 * separate transpile step is needed. A missing file or an
 * import-time throw becomes a typed {@link ConfigLoadError}
 * — config loading never throws. The framework owns the
 * import + default-pick + typed-error machinery; the app
 * supplies its own config schema via `cast`.
 */
export const loadConfig = <T>(
  path: SoftStr,
  cast: (
    value: unknown,
  ) => Result<T, InvalidError>,
): PromisedResult<T, ConfigLoadError> =>
  import(
    pathToFileURL(resolve(path)).href
  ).then(
    (mod: unknown) =>
      validate(path, cast, pickDefault(mod)),
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
