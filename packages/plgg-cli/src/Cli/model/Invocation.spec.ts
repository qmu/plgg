import {
  test,
  check,
  toBe,
} from "plgg-test";
import { getOr } from "plgg";
import {
  type Invocation,
  optionOf,
  hasFlag,
} from "plgg-cli/index";

const inv: Invocation = {
  command: "build",
  options: { config: "site.ts" },
  flags: ["watch"],
  positionals: ["x"],
};

test("optionOf reads a supplied value-option", () =>
  check(
    getOr("<none>")(optionOf("config")(inv)),
    toBe("site.ts"),
  ));

test("optionOf is None for an absent option", () =>
  check(
    getOr("<none>")(optionOf("outDir")(inv)),
    toBe("<none>"),
  ));

test("hasFlag is true for a present flag", () =>
  check(hasFlag("watch")(inv), toBe(true)));

test("hasFlag is false for an absent flag", () =>
  check(hasFlag("quiet")(inv), toBe(false)));
