import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { type Invocation } from "plgg-cli";
import {
  type AppRunContext,
  configPathOf,
  resolveOptions,
} from "plggpress/framework/Cli/usecase/resolveOptions";

const invOf = (
  options: Record<string, string>,
): Invocation => ({
  command: "build",
  options,
  flags: [],
  positionals: [],
});

const ctx: AppRunContext = {
  base: "/plgg/",
};

test("configPathOf uses --config when supplied", () =>
  check(
    configPathOf(
      invOf({ config: "/abs/site.config.ts" }),
      "app.config.ts",
    ),
    toBe("/abs/site.config.ts"),
  ));

test("configPathOf falls back to the cwd default filename", () =>
  check(
    configPathOf(invOf({}), "app.config.ts"),
    toContain("app.config.ts"),
  ));

test("resolveOptions fills cwd defaults + threads the app context", () => {
  const opts = resolveOptions(invOf({}), ctx);
  return all([
    check(opts.base, toBe("/plgg/")),
    check(opts.outDir, toContain("dist")),
    check(opts.assetsDir, toContain("public")),
  ]);
});

test("resolveOptions honors --contentDir/--outDir", () => {
  const opts = resolveOptions(
    invOf({
      contentDir: "/work/docs",
      outDir: "/work/site",
    }),
    ctx,
  );
  return all([
    check(opts.contentDir, toBe("/work/docs")),
    check(opts.outDir, toBe("/work/site")),
    check(
      opts.assetsDir,
      toBe("/work/docs/public"),
    ),
  ]);
});
