import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { type DevSettings } from "plggpress/framework/Dev/model/DevPlan";
import {
  DEV_ENV,
  devEntryEnvOf,
  devEntryEnvFrom,
} from "plggpress/framework/Dev/usecase/devEntryEnv";

const settings: DevSettings = {
  root: "/work/site",
  contentDir: "/work/site/docs",
  configPath: "/work/site/site.config.ts",
  base: "/plgg/",
  entry: "/press/src/devServerEntry.ts",
  aliasPrefix: "plggpress",
  appSrcDir: "/press/src",
  port: 5199,
  allowedHosts: ["localhost"],
  watchTheme: false,
};

test("devEntryEnvOf publishes the three options the dev entry re-reads", () =>
  check(
    devEntryEnvOf(settings),
    toEqual({
      PLGGPRESS_DEV_CONTENT_DIR:
        "/work/site/docs",
      PLGGPRESS_DEV_CONFIG:
        "/work/site/site.config.ts",
      PLGGPRESS_DEV_BASE: "/plgg/",
    }),
  ));

test("devEntryEnvFrom round-trips what devEntryEnvOf wrote", () =>
  check(
    devEntryEnvFrom(devEntryEnvOf(settings)),
    okThen((env) =>
      all([
        check(
          env.contentDir,
          toBe("/work/site/docs"),
        ),
        check(
          env.configPath,
          toBe("/work/site/site.config.ts"),
        ),
        check(env.base, toBe("/plgg/")),
      ]),
    ),
  ));

test("devEntryEnvFrom ignores unrelated variables in the environment", () =>
  check(
    devEntryEnvFrom({
      ...devEntryEnvOf(settings),
      PATH: "/usr/bin",
      HOME: "/home/dev",
    }),
    okThen((env) =>
      check(env.base, toBe("/plgg/")),
    ),
  ));

test("devEntryEnvFrom names the missing variable rather than throwing", () =>
  all([
    check(
      devEntryEnvFrom({}),
      errThen((m) =>
        toContain(DEV_ENV.contentDir)(m),
      ),
    ),
    check(
      devEntryEnvFrom({
        [DEV_ENV.contentDir]: "/work/site/docs",
      }),
      errThen((m) =>
        toContain(DEV_ENV.configPath)(m),
      ),
    ),
    check(
      devEntryEnvFrom({
        [DEV_ENV.contentDir]: "/work/site/docs",
        [DEV_ENV.configPath]: "/work/site/x.ts",
      }),
      errThen((m) => toContain(DEV_ENV.base)(m)),
    ),
  ]));
