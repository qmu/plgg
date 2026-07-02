import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { matchOption } from "plgg";
import {
  option,
  flag,
  command,
  program,
} from "plgg-cli/index";

test("option declares a value-option carrying its placeholder", () =>
  check(
    matchOption(
      (): string => "<none>",
      (arg: string): string => arg,
    )(option("config", "path").arg),
    toBe("path"),
  ));

test("flag declares a boolean flag with no value", () =>
  check(
    matchOption(
      (): boolean => true,
      (): boolean => false,
    )(flag("watch").arg),
    toBe(true),
  ));

test("option carries its name and summary", () => {
  const o = option(
    "config",
    "path",
    "the config file",
  );
  return all([
    check(o.name, toBe("config")),
    check(o.summary, toBe("the config file")),
  ]);
});

test("option summary defaults to empty", () =>
  check(
    option("config", "path").summary,
    toBe(""),
  ));

test("command carries name, summary, and options", () => {
  const c = command("build", "build it", [
    option("config", "path"),
  ]);
  return all([
    check(c.name, toBe("build")),
    check(c.summary, toBe("build it")),
    check(c.options.length, toBe(1)),
  ]);
});

test("command options default to empty", () =>
  check(
    command("dev", "run").options.length,
    toBe(0),
  ));

test("program carries name, summary, and commands", () => {
  const p = program("app", "an app", [
    command("build", "b"),
  ]);
  return all([
    check(p.name, toBe("app")),
    check(p.summary, toBe("an app")),
    check(p.commands.length, toBe(1)),
  ]);
});

test("program commands default to empty", () =>
  check(
    program("app", "an app").commands.length,
    toBe(0),
  ));
