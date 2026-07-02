import { resolve } from "node:path";
import {
  type SoftStr,
  pipe,
  getOr,
} from "plgg";
import {
  type Invocation,
  optionOf,
} from "plgg-cli";
import { type AppOptions } from "plggmatic/App/model/AppOptions";

/**
 * The app-specific bit the framework cannot derive from
 * cwd + flags: the deploy `base`, read from the app's
 * validated config. The framework fills every other
 * {@link AppOptions} field.
 */
export type AppRunContext = Readonly<{
  base: SoftStr;
}>;

/**
 * The config path for this run: `--config <path>` or the
 * cwd default `configFile` (the app names its own default,
 * e.g. `site.config.ts`).
 */
export const configPathOf = (
  invocation: Invocation,
  configFile: SoftStr,
): SoftStr =>
  pipe(
    optionOf("config")(invocation),
    getOr(resolve(process.cwd(), configFile)),
  );

/**
 * Resolve {@link AppOptions} from cwd defaults, the parsed
 * invocation flags, and the app's {@link AppRunContext}.
 * `contentDir` defaults to cwd, `outDir` to `<cwd>/dist`,
 * `assetsDir` to `<contentDir>/public`; `base` and
 * `allowedHosts` come from the app config via `ctx`.
 */
export const resolveOptions = (
  invocation: Invocation,
  ctx: AppRunContext,
): AppOptions => {
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
    base: ctx.base,
  };
};
