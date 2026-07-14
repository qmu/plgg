import {
  test,
  check,
  all,
  toBe,
  toContain,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { type Invocation } from "plgg-cli";
import {
  type DevInputs,
  DEFAULT_DEV_PORT,
  resolveDev,
} from "plggpress/framework/Dev/usecase/resolveDev";

const invOf = (
  options: Record<string, string>,
  flags: ReadonlyArray<string> = [],
): Invocation => ({
  command: "dev",
  options,
  flags,
  positionals: [],
});

const inputs: DevInputs = {
  cwd: "/work/site",
  base: "/plgg/",
  configFile: "site.config.ts",
  entry: "/press/src/devServerEntry.ts",
  aliasPrefix: "plggpress",
  appSrcDir: "/press/src",
  configAllowedHosts: ["docs.example.dev"],
  hasConventionalContentDir: false,
};

const withInputs = (
  patch: Partial<DevInputs>,
): DevInputs => ({ ...inputs, ...patch });

test("resolveDev fills every default: port, cwd content root, config, base", () =>
  check(
    resolveDev(invOf({}), inputs),
    okThen((s) =>
      all([
        check(s.port, toBe(DEFAULT_DEV_PORT)),
        check(s.contentDir, toBe("/work/site")),
        check(
          s.configPath,
          toBe("/work/site/site.config.ts"),
        ),
        check(s.base, toBe("/plgg/")),
        check(s.root, toBe("/work/site")),
        check(s.watchTheme, toBe(false)),
      ]),
    ),
  ));

test("resolveDev adopts docs/ as the content root when the repo has one", () =>
  check(
    resolveDev(
      invOf({}),
      withInputs({
        hasConventionalContentDir: true,
      }),
    ),
    okThen((s) =>
      check(
        s.contentDir,
        toBe("/work/site/docs"),
      ),
    ),
  ));

test("resolveDev lets --contentDir override the docs/ convention", () =>
  check(
    resolveDev(
      invOf({ contentDir: "book" }),
      withInputs({
        hasConventionalContentDir: true,
      }),
    ),
    okThen((s) =>
      check(
        s.contentDir,
        toBe("/work/site/book"),
      ),
    ),
  ));

test("resolveDev resolves an absolute --contentDir/--config as given", () =>
  check(
    resolveDev(
      invOf({
        contentDir: "/elsewhere/docs",
        config: "/elsewhere/site.config.ts",
      }),
      inputs,
    ),
    okThen((s) =>
      all([
        check(
          s.contentDir,
          toBe("/elsewhere/docs"),
        ),
        check(
          s.configPath,
          toBe("/elsewhere/site.config.ts"),
        ),
      ]),
    ),
  ));

test("resolveDev threads the app's shipped entry + source location through", () =>
  check(
    resolveDev(invOf({}), inputs),
    okThen((s) =>
      all([
        check(
          s.entry,
          toBe("/press/src/devServerEntry.ts"),
        ),
        check(s.appSrcDir, toBe("/press/src")),
        check(s.aliasPrefix, toBe("plggpress")),
      ]),
    ),
  ));

test("resolveDev accepts a valid --port", () =>
  check(
    resolveDev(invOf({ port: "5199" }), inputs),
    okThen((s) => check(s.port, toBe(5199))),
  ));

test("resolveDev rejects a bad --port with a one-line Err", () =>
  all([
    check(
      resolveDev(invOf({ port: "abc" }), inputs),
      errThen((m) =>
        toContain("invalid --port")(m),
      ),
    ),
    check(
      resolveDev(
        invOf({ port: "99999" }),
        inputs,
      ),
      errThen((m) =>
        toContain("invalid --port")(m),
      ),
    ),
  ]));

test("resolveDev allows loopback plus the config's hosts, de-duplicated", () =>
  check(
    resolveDev(
      invOf({}),
      withInputs({
        configAllowedHosts: [
          "docs.example.dev",
          "localhost",
        ],
      }),
    ),
    okThen((s) =>
      check(
        s.allowedHosts,
        toEqual([
          "localhost",
          "docs.example.dev",
        ]),
      ),
    ),
  ));

test("resolveDev adds an ad-hoc --host to the allowlist", () =>
  check(
    resolveDev(
      invOf({ host: "tunnel.qmu.dev" }),
      inputs,
    ),
    okThen((s) =>
      check(
        s.allowedHosts,
        toEqual([
          "localhost",
          "docs.example.dev",
          "tunnel.qmu.dev",
        ]),
      ),
    ),
  ));

test("resolveDev turns theme watching on only with --watch-theme", () =>
  check(
    resolveDev(
      invOf({}, ["watch-theme"]),
      inputs,
    ),
    okThen((s) =>
      check(s.watchTheme, toBe(true)),
    ),
  ));
