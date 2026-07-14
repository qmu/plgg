import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { type DevSettings } from "plggpress/framework/Dev/model/DevPlan";
import { devPlanOf } from "plggpress/framework/Dev/usecase/devPlan";

const settings: DevSettings = {
  root: "/work/site",
  contentDir: "/work/site/docs",
  configPath: "/work/site/site.config.ts",
  base: "/",
  entry: "/press/src/devServerEntry.ts",
  aliasPrefix: "plggpress",
  appSrcDir: "/press/src",
  port: 5199,
  allowedHosts: ["localhost"],
  watchTheme: false,
};

test("devPlanOf assembles a dev plan that never builds", () => {
  const plan = devPlanOf(settings);
  return all([
    check(plan.entries, toEqual([])),
    check(plan.formats, toEqual(["es"])),
    check(plan.root, toBe("/work/site")),
    check(plan.rootDir, toBe(".")),
    check(plan.outDir, toBe("dist")),
    check(
      plan.fileNamePattern,
      toBe("[name].[format].js"),
    ),
  ]);
});

test("devPlanOf points the dev section at the shipped entry, port and hosts", () => {
  const plan = devPlanOf(settings);
  return all([
    check(
      plan.dev.entry,
      toBe("/press/src/devServerEntry.ts"),
    ),
    check(plan.dev.port, toBe(5199)),
    check(
      plan.dev.allowedHosts,
      toEqual(["localhost"]),
    ),
  ]);
});

test("devPlanOf watches ONLY content + config by default (not the theme)", () =>
  check(
    devPlanOf(settings).dev.watch,
    toEqual([
      "/work/site/docs",
      "/work/site/site.config.ts",
    ]),
  ));

test("devPlanOf adds the theme source to the watch roots under --watch-theme", () =>
  check(
    devPlanOf({ ...settings, watchTheme: true })
      .dev.watch,
    toEqual([
      "/work/site/docs",
      "/work/site/site.config.ts",
      "/press/src",
    ]),
  ));

test("devPlanOf never declares sourceAliases — the CLI already runs from its own source", () =>
  all([
    check(
      devPlanOf(settings).dev.sourceAliases,
      toEqual([]),
    ),
    check(
      devPlanOf({
        ...settings,
        watchTheme: true,
      }).dev.sourceAliases,
      toEqual([]),
    ),
  ]));

test("devPlanOf states the self-alias root-relative, so the graph scan resolves it", () =>
  check(
    devPlanOf(settings).alias,
    toEqual({
      prefix: "plggpress",
      srcRoot: "../../press/src",
    }),
  ));
