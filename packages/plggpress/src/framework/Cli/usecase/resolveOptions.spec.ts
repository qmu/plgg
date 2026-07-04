import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
  errThen,
} from "plgg-test";
import { type Invocation } from "plgg-cli";
import {
  type AppRunContext,
  configPathOf,
  resolveOptions,
  resolveServe,
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

test("resolveServe defaults to port 3000 with no hostname", () =>
  check(
    resolveServe(invOf({})),
    okThen((s) =>
      all([
        check(s.port, toBe(3000)),
        check(s.hostname.__tag, toBe("None")),
      ]),
    ),
  ));

test("resolveServe parses a valid --port and threads --hostname", () =>
  check(
    resolveServe(
      invOf({ port: "8080", hostname: "127.0.0.1" }),
    ),
    okThen((s) =>
      all([
        check(s.port, toBe(8080)),
        check(
          s.hostname.__tag === "Some"
            ? s.hostname.content
            : "none",
          toBe("127.0.0.1"),
        ),
      ]),
    ),
  ));

test("resolveServe rejects a non-integer / out-of-range --port with a one-line Err", () =>
  all([
    check(
      resolveServe(invOf({ port: "abc" })),
      errThen((m) => toContain("invalid --port")(m)),
    ),
    check(
      resolveServe(invOf({ port: "3.5" })),
      errThen((m) => toContain("invalid --port")(m)),
    ),
    check(
      resolveServe(invOf({ port: "99999" })),
      errThen((m) => toContain("invalid --port")(m)),
    ),
  ]));
