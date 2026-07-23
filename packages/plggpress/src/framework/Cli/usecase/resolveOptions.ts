import { resolve } from "node:path";
import {
  type SoftStr,
  type Option,
  type Result,
  pipe,
  getOr,
  ok,
  err,
  matchOption,
} from "plgg";
import {
  type Invocation,
  optionOf,
} from "plgg-cli";
import { type AppOptions } from "plggpress/framework/App/model/AppOptions";

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

/**
 * The per-environment operational settings the `serve` verb
 * needs, kept OUT of `SiteConfig` (like `base` via
 * `DOCS_BASE`) so the config stays byte-untouched — the
 * cheapest proof of the SSG byte-identity gate (D5). `port`
 * defaults to `3000` (the node adapter's own example);
 * `hostname` is optional (the adapter binds all interfaces
 * when absent).
 */
export type ServeSettings = Readonly<{
  port: number;
  hostname: Option<SoftStr>;
}>;

/**
 * Parse a `--port` flag value into a TCP port, or a
 * one-line `Err` on garbage — a number, an integer, in
 * range. Shared by `serve` ({@link resolveServe}) and `dev`
 * (`framework/Dev/usecase/resolveDev`) so both reject a bad
 * port with the same message.
 */
export const asPort = (
  raw: SoftStr,
): Result<number, SoftStr> => {
  const n = Number(raw);
  return Number.isInteger(n) &&
    n >= 0 &&
    n <= 65535
    ? ok(n)
    : err(
        `invalid --port: ${raw} (expected an integer 0..65535)`,
      );
};

/**
 * Resolve {@link ServeSettings} from the invocation flags:
 * `--port` (validated, default 3000) and the optional
 * `--hostname`. A bad `--port` short-circuits to an `Err`
 * message the CLI prints — never a throw.
 */
export const resolveServe = (
  invocation: Invocation,
): Result<ServeSettings, SoftStr> =>
  pipe(
    optionOf("port")(invocation),
    matchOption(
      (): Result<ServeSettings, SoftStr> =>
        ok({
          port: 3000,
          hostname:
            optionOf("hostname")(invocation),
        }),
      (
        raw: SoftStr,
      ): Result<ServeSettings, SoftStr> =>
        pipe(asPort(raw), (r) =>
          r.__tag === "Ok"
            ? ok({
                port: r.content,
                hostname:
                  optionOf("hostname")(
                    invocation,
                  ),
              })
            : err(r.content),
        ),
    ),
  );
