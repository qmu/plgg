import {
  test,
  check,
  all,
  toBe,
  toEqual,
  toContain,
} from "plgg-test";
import { SoftStr } from "plgg";
import { tokenize } from "plgg-highlight/Token/usecase/tokenize";

/** The ordered kind-tags of a tokenized source. */
const kindsOf = (
  src: SoftStr,
): ReadonlyArray<SoftStr> =>
  tokenize(src).map((t) => t.content.kind.__tag);

/** The reconstructed source from a token stream. */
const rejoin = (src: SoftStr): SoftStr =>
  tokenize(src)
    .map((t) => t.content.text)
    .join("");

test("token texts concatenate back to the exact source (trivia preserved)", () =>
  all([
    check(
      rejoin("const x = 1;\n// c\n"),
      toBe("const x = 1;\n// c\n"),
    ),
    check(
      rejoin('let s = "hi";'),
      toBe('let s = "hi";'),
    ),
  ]));

test("empty source yields no tokens", () =>
  check(tokenize(""), toEqual([])));

test("keywords, identifiers, punctuation and numbers are classified", () =>
  all([
    check(
      kindsOf("const x = 1"),
      toContain("Keyword"),
    ),
    check(
      kindsOf("const x = 1"),
      toContain("Identifier"),
    ),
    check(
      kindsOf("const x = 1"),
      toContain("Punctuation"),
    ),
    check(
      kindsOf("const x = 1"),
      toContain("Number"),
    ),
  ]));

test("string literals are classified", () =>
  check(
    kindsOf('const s = "hi"'),
    toContain("String"),
  ));

test("comments are classified (line and block)", () =>
  all([
    check(
      kindsOf("// note\n1"),
      toContain("Comment"),
    ),
    check(
      kindsOf("/* note */ 1"),
      toContain("Comment"),
    ),
  ]));

test("template strings are classified", () =>
  check(
    kindsOf("const t = `a${b}c`"),
    toContain("Template"),
  ));

test("whitespace rides along as Plain", () =>
  check(kindsOf("a   b"), toContain("Plain")));

test("irregular / non-code input never throws and round-trips", () =>
  all([
    check(rejoin("@#$ €¥ 漢字"), toBe("@#$ €¥ 漢字")),
    check(
      rejoin("```not code```"),
      toBe("```not code```"),
    ),
  ]));
