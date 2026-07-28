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
import { getOr } from "plgg";
import {
  type Invocation,
  optionOf,
  hasFlag,
  optionList,
  optionInt,
} from "plgg-cli/index";

const inv: Invocation = {
  command: "build",
  options: { config: "site.ts" },
  flags: ["watch"],
  positionals: ["x"],
};

/** An invocation carrying a single value-option. */
const withOption = (
  name: string,
  value: string,
): Invocation => ({
  command: "run",
  options: { [name]: value },
  flags: [],
  positionals: [],
});

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

test("optionList splits a comma list, trimming and dropping empties", () =>
  check(
    optionList("ids")(
      withOption("ids", "a, b ,, c "),
    ),
    toEqual(["a", "b", "c"]),
  ));

test("optionList is the empty list for an absent option", () =>
  check(optionList("ids")(inv), toEqual([])));

test("optionInt reads a present positive integer", () =>
  check(
    optionInt("limit", 10)(
      withOption("limit", "42"),
    ),
    okThen(toBe(42)),
  ));

test("optionInt falls back when the option is absent", () =>
  check(
    optionInt("limit", 10)(inv),
    okThen(toBe(10)),
  ));

test("optionInt rejects non-integer, non-positive, and non-numeric values", () =>
  all([
    check(
      optionInt("limit", 10)(
        withOption("limit", "3.5"),
      ),
      errThen((m) => toContain("positive integer")(m)),
    ),
    check(
      optionInt("limit", 10)(
        withOption("limit", "-2"),
      ),
      errThen((m) => toContain("positive integer")(m)),
    ),
    check(
      optionInt("limit", 10)(
        withOption("limit", "abc"),
      ),
      errThen((m) => toContain('got "abc"')(m)),
    ),
  ]));
