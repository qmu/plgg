import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type Result,
  type InvalidError,
  isOk,
  isErr,
  matchResult,
} from "plgg";
import {
  type YamlMap,
} from "plgg-md/Yaml/model/YamlValue";
import { parseYamlSubset } from "plgg-md/Yaml/usecase/parseYamlSubset";
import { foldYaml } from "plgg-md/Yaml/usecase/foldYaml";

const folded = (
  r: Result<YamlMap, InvalidError>,
): unknown =>
  matchResult<YamlMap, InvalidError, unknown>(
    () => "ERR",
    (m: YamlMap) => foldYaml(m),
  )(r);

test("flat scalars parse to typed values", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "title: Hello World",
          "count: 42",
          "ratio: -1.5",
          "draft: true",
          "quoted: \"a: b\"",
          "single: 'it''s'",
        ].join("\n"),
      ),
    ),
    toEqual({
      title: "Hello World",
      count: 42,
      ratio: -1.5,
      draft: true,
      quoted: "a: b",
      single: "it's",
    }),
  ));

test("comments and blank lines are ignored", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "# a comment",
          "",
          "layout: home",
          "  # indented comment is skipped",
        ].join("\n"),
      ),
    ),
    toEqual({ layout: "home" }),
  ));

test("a sequence block of scalars parses to an array", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "tags:",
          "  - alpha",
          "  - beta",
          "  - 3",
        ].join("\n"),
      ),
    ),
    toEqual({ tags: ["alpha", "beta", 3] }),
  ));

test("a one-level nested map of scalars parses to a record", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "author:",
          "  name: Ada",
          "  admin: true",
        ].join("\n"),
      ),
    ),
    toEqual({
      author: { name: "Ada", admin: true },
    }),
  ));

test("a duplicate key is an error, not last-wins", () =>
  check(
    isErr(
      parseYamlSubset("a: 1\na: 2"),
    ),
    toBe(true),
  ));

test("an unterminated quote is a positioned error", () =>
  check(
    isErr(parseYamlSubset('title: "oops')),
    toBe(true),
  ));

test("an unsupported construct is rejected", () =>
  all([
    check(
      isErr(parseYamlSubset("ref: &anchor x")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("flow: [a, b]")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("block: |")),
      toBe(true),
    ),
  ]));

test("a malformed line (no colon) is an error", () =>
  check(
    isErr(parseYamlSubset("just a line")),
    toBe(true),
  ));

test("a key with no value and no block is an error", () =>
  check(
    isErr(parseYamlSubset("empty:")),
    toBe(true),
  ));

test("an empty document is an empty map", () =>
  check(isOk(parseYamlSubset("")), toBe(true)));

test("yes/no/on/off are strings, not booleans (subset)", () =>
  check(
    folded(parseYamlSubset("flag: yes")),
    toEqual({ flag: "yes" }),
  ));

test("unexpected indentation at the document root is an error", () =>
  check(
    isErr(parseYamlSubset("  a: 1")),
    toBe(true),
  ));

test("a mixed seq/scalar item in a block is an error", () =>
  check(
    isErr(
      parseYamlSubset(
        "tags:\n  - alpha\n  notaseq: x",
      ),
    ),
    toBe(true),
  ));

test("a nested map entry without a value is an error", () =>
  check(
    isErr(
      parseYamlSubset("author:\n  name:"),
    ),
    toBe(true),
  ));

test("a nested map with a duplicate key is an error", () =>
  check(
    isErr(
      parseYamlSubset(
        "author:\n  name: a\n  name: b",
      ),
    ),
    toBe(true),
  ));

test("a scalar in a sequence can be quoted", () =>
  check(
    folded(
      parseYamlSubset(
        "tags:\n  - \"a, b\"\n  - plain",
      ),
    ),
    toEqual({ tags: ["a, b", "plain"] }),
  ));

test("an excluded merge/flow value in a map entry errors", () =>
  check(
    isErr(
      parseYamlSubset(
        "cfg:\n  flow: [1, 2]",
      ),
    ),
    toBe(true),
  ));
