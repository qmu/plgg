import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { getOr } from "plgg";
import {
  command,
  option,
  flag,
  parseOptions,
  optionOf,
} from "plgg-cli/index";

const build = command("build", "build", [
  option("config", "path"),
  option("outDir", "path"),
  flag("watch"),
]);

test("parseOptions records a value-option and its value", () =>
  check(
    parseOptions(build, ["--config", "site.ts"]),
    okThen((inv) =>
      check(
        getOr("<none>")(
          optionOf("config")(inv),
        ),
        toBe("site.ts"),
      ),
    ),
  ));

test("parseOptions records a boolean flag's presence", () =>
  check(
    parseOptions(build, ["--watch"]),
    okThen((inv) =>
      check(
        inv.flags.includes("watch"),
        toBe(true),
      ),
    ),
  ));

test("parseOptions keeps the command name on the invocation", () =>
  check(
    parseOptions(build, []),
    okThen((inv) =>
      check(inv.command, toBe("build")),
    ),
  ));

test("parseOptions collects positionals", () =>
  check(
    parseOptions(build, ["one", "two"]),
    okThen((inv) =>
      check(
        inv.positionals.join(","),
        toBe("one,two"),
      ),
    ),
  ));

test("parseOptions errors when a value-option has no value", () =>
  check(
    parseOptions(build, ["--config"]),
    errThen((e) =>
      check(e.__tag, toBe("MissingOptionValue")),
    ),
  ));

test("parseOptions errors on an unknown option", () =>
  check(
    parseOptions(build, ["--nope"]),
    errThen((e) =>
      check(e.__tag, toBe("UnknownOption")),
    ),
  ));

test("parseOptions records an empty-string value-option value", () =>
  check(
    parseOptions(build, ["--config", ""]),
    okThen((inv) =>
      check(
        getOr("<none>")(
          optionOf("config")(inv),
        ),
        toBe(""),
      ),
    ),
  ));

test("parseOptions parses a mix of options, flags, and positionals", () =>
  check(
    parseOptions(build, [
      "pos",
      "--config",
      "c.ts",
      "--watch",
      "--outDir",
      "out",
    ]),
    okThen((inv) =>
      all([
        check(
          getOr("<none>")(
            optionOf("config")(inv),
          ),
          toBe("c.ts"),
        ),
        check(
          getOr("<none>")(
            optionOf("outDir")(inv),
          ),
          toBe("out"),
        ),
        check(
          inv.flags.includes("watch"),
          toBe(true),
        ),
        check(
          inv.positionals.join(","),
          toBe("pos"),
        ),
      ]),
    ),
  ));
