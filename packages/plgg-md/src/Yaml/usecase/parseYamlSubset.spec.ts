import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
} from "plgg-test";
import {
  type Result,
  type InvalidError,
  isOk,
  isErr,
  matchResult,
  plggErrorMessage,
} from "plgg";
import { type YamlMap } from "plgg-md/Yaml/model/YamlValue";
import { parseYamlSubset } from "plgg-md/Yaml/usecase/parseYamlSubset";
import { foldYaml } from "plgg-md/Yaml/usecase/foldYaml";

const folded = (
  r: Result<YamlMap, InvalidError>,
): unknown =>
  matchResult<YamlMap, InvalidError, unknown>(
    () => "ERR",
    (m: YamlMap) => foldYaml(m),
  )(r);

/** The error message of a rejected document ("OK" if it parsed). */
const message = (
  r: Result<YamlMap, InvalidError>,
): string =>
  matchResult<YamlMap, InvalidError, string>(
    (e: InvalidError) => plggErrorMessage(e),
    () => "OK",
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
          'quoted: "a: b"',
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
    isErr(parseYamlSubset("a: 1\na: 2")),
    toBe(true),
  ));

test("an unterminated quote is a positioned error", () =>
  check(
    isErr(parseYamlSubset('title: "oops')),
    toBe(true),
  ));

test("an expanding construct is still rejected", () =>
  all([
    check(
      isErr(parseYamlSubset("ref: &anchor x")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("ref: *anchor")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("tag: !!int 7")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("block: |")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("fold: >")),
      toBe(true),
    ),
  ]));

test("a malformed line (no colon) is an error", () =>
  check(
    isErr(parseYamlSubset("just a line")),
    toBe(true),
  ));

// --- the absent value: a bare `key:` ---

test("a bare key: is omitted, so a caster reads it as None", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "commit_hash:",
          "title: Real",
          "depends_on:",
        ].join("\n"),
      ),
    ),
    toEqual({ title: "Real" }),
  ));

test("a bare key: is absent, NOT an empty string or empty list", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "bare:",
          'empty_string: ""',
          "empty_list: []",
        ].join("\n"),
      ),
    ),
    toEqual({
      empty_string: "",
      empty_list: [],
    }),
  ));

test("a bare key: still counts as a key for duplicate detection", () =>
  check(
    isErr(parseYamlSubset("a:\na: 1")),
    toBe(true),
  ));

test("a bare key: does not swallow the next entry", () =>
  check(
    folded(
      parseYamlSubset(
        ["mission:", "layer: [UX]"].join("\n"),
      ),
    ),
    toEqual({ layer: ["UX"] }),
  ));

// --- flow collections: the inline spelling ---

test("a flow sequence parses to the same value as its block spelling", () =>
  check(
    folded(
      parseYamlSubset("tags: [alpha, beta, 3]"),
    ),
    toEqual(
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
    ),
  ));

test("a flow sequence classifies elements like a scalar", () =>
  check(
    folded(
      parseYamlSubset(
        "mixed: [str, 42, -1.5, true, false]",
      ),
    ),
    toEqual({
      mixed: ["str", 42, -1.5, true, false],
    }),
  ));

test("this ticket's own frontmatter shape parses", () =>
  check(
    folded(
      parseYamlSubset(
        [
          "layer: [Infrastructure]",
          "type: enhancement",
          "commit_hash:",
        ].join("\n"),
      ),
    ),
    toEqual({
      layer: ["Infrastructure"],
      type: "enhancement",
    }),
  ));

test("a flow sequence tolerates spacing", () =>
  all([
    check(
      folded(parseYamlSubset("a: [ x , y ]")),
      toEqual({ a: ["x", "y"] }),
    ),
    check(
      folded(parseYamlSubset("a: []")),
      toEqual({ a: [] }),
    ),
    check(
      folded(parseYamlSubset("a: [ ]")),
      toEqual({ a: [] }),
    ),
  ]));

test("a comma inside a quoted element is content, not a separator", () =>
  all([
    check(
      folded(parseYamlSubset('a: ["x,y", z]')),
      toEqual({ a: ["x,y", "z"] }),
    ),
    check(
      folded(parseYamlSubset("a: ['x,y']")),
      toEqual({ a: ["x,y"] }),
    ),
  ]));

test("a flow mapping parses to the same value as its block spelling", () =>
  check(
    folded(
      parseYamlSubset(
        "author: {name: Ada, admin: true}",
      ),
    ),
    toEqual(
      folded(
        parseYamlSubset(
          [
            "author:",
            "  name: Ada",
            "  admin: true",
          ].join("\n"),
        ),
      ),
    ),
  ));

test("an empty flow mapping is an empty record", () =>
  check(
    folded(parseYamlSubset("author: {}")),
    toEqual({ author: {} }),
  ));

test("a duplicate key in a flow mapping is an error, not last-wins", () =>
  check(
    isErr(parseYamlSubset("a: {k: 1, k: 2}")),
    toBe(true),
  ));

test("a flow mapping entry with no key is an error", () =>
  check(
    isErr(parseYamlSubset("a: {: 1}")),
    toBe(true),
  ));

// --- the one-level bound holds by construction ---

test("a NESTED flow collection is rejected", () =>
  all([
    check(
      isErr(parseYamlSubset("a: [[x]]")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("a: [{k: 1}]")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("a: {k: [x]}")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("a: {k: {j: 1}}")),
      toBe(true),
    ),
  ]));

test("a flow collection under a block sequence item is rejected", () =>
  check(
    isErr(parseYamlSubset("a:\n  - [x]")),
    toBe(true),
  ));

// A nested element IS refused, but `sepBy` reads a failed
// element as "zero elements", so the surfacing error is the
// unmatched close bracket rather than EXCLUDED_LEAD's. Pinned
// because plainFlowScalar's doc comment says so — a claim
// about a message is worth only as much as the spec holding
// it.
test("a nested flow element fails at the close bracket, not on EXCLUDED_LEAD", () =>
  check(
    message(parseYamlSubset("a: [[x]]")),
    toContain('expected "]"'),
  ));

// Whereas a nested flow in SCALAR position — a block `- `
// item — reaches parseScalarValue directly, so there the
// construct IS named.
test("a nested flow in scalar position names the construct", () =>
  check(
    message(parseYamlSubset("a:\n  - [x]")),
    toContain(
      'unsupported YAML construct starting with "["',
    ),
  ));

test("an expanding construct inside a flow element is rejected", () =>
  check(
    isErr(parseYamlSubset("a: [&anchor x]")),
    toBe(true),
  ));

test("an unterminated or trailing-junk flow collection is an error", () =>
  all([
    check(
      isErr(parseYamlSubset("a: [x")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("a: [x] junk")),
      toBe(true),
    ),
    check(
      isErr(parseYamlSubset("a: [x,,y]")),
      toBe(true),
    ),
  ]));

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
    isErr(parseYamlSubset("author:\n  name:")),
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
        'tags:\n  - "a, b"\n  - plain',
      ),
    ),
    toEqual({ tags: ["a, b", "plain"] }),
  ));

test("an excluded merge/flow value in a map entry errors", () =>
  check(
    isErr(
      parseYamlSubset("cfg:\n  flow: [1, 2]"),
    ),
    toBe(true),
  ));
