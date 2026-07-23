import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  program,
  command,
  option,
  flag,
  usage,
} from "plgg-cli/index";

const app = program(
  "plggpress",
  "static site generator",
  [
    command("build", "build", [
      option("config", "path"),
      flag("watch"),
    ]),
    command("dev", "dev"),
  ],
);

test("usage renders the program name and summary header", () =>
  check(
    usage(app).includes(
      "plggpress — static site generator",
    ),
    toBe(true),
  ));

test("usage renders a value-option as [--name <arg>]", () =>
  check(
    usage(app).includes("[--config <path>]"),
    toBe(true),
  ));

test("usage renders a boolean flag as [--name]", () =>
  check(
    usage(app).includes("[--watch]"),
    toBe(true),
  ));

test("usage lists a line per command", () =>
  all([
    check(
      usage(app).includes("plggpress build"),
      toBe(true),
    ),
    check(
      usage(app).includes("plggpress dev"),
      toBe(true),
    ),
  ]));
