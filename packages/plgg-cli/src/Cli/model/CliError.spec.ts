import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  missingOptionValue,
  unknownOption,
  isMissingOptionValue,
  isUnknownOption,
  formatCliError,
} from "plgg-cli/index";

test("missingOptionValue carries the option name", () =>
  check(
    missingOptionValue("config").content.option,
    toBe("config"),
  ));

test("unknownOption carries the option name", () =>
  check(
    unknownOption("foo").content.option,
    toBe("foo"),
  ));

test("isMissingOptionValue narrows only its own variant", () =>
  all([
    check(
      isMissingOptionValue(
        missingOptionValue("c"),
      ),
      toBe(true),
    ),
    check(
      isMissingOptionValue(unknownOption("c")),
      toBe(false),
    ),
  ]));

test("isUnknownOption narrows only its own variant", () =>
  all([
    check(
      isUnknownOption(unknownOption("c")),
      toBe(true),
    ),
    check(
      isUnknownOption(missingOptionValue("c")),
      toBe(false),
    ),
  ]));

test("formatCliError renders the missing-value message", () =>
  check(
    formatCliError(missingOptionValue("config")),
    toBe("missing value for option --config"),
  ));

test("formatCliError renders the unknown-option message", () =>
  check(
    formatCliError(unknownOption("foo")),
    toBe("unknown option --foo"),
  ));
