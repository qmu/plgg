import {
  test,
  check,
  all,
  toBe,
  toContain,
  toEqual,
} from "plgg-test";
import { SoftStr } from "plgg";
import { tsLex } from "plgg-parser/Demo/usecase/tsLexer";

/** The ordered kind-tags of a lexed source. */
const kindsOf = (
  src: SoftStr,
): ReadonlyArray<SoftStr> =>
  tsLex(src).map((t) => t.content.kind.__tag);

/** The reconstructed source from the token stream. */
const rejoin = (src: SoftStr): SoftStr =>
  tsLex(src)
    .map((t) => t.content.text)
    .join("");

/** Does the lexed source contain a token of `kind`? */
const hasKind = (
  src: SoftStr,
  kind: SoftStr,
): boolean => kindsOf(src).includes(kind);

// A representative snippet as it would appear inside <pre>.
// (Written with literal backticks / ${} — this is code TEXT,
// not an interpolated string.)
const SNIPPET =
  "const greet = (name: string): string => {\n" +
  "  // greeting\n" +
  "  return `Hello, ${name}!`;\n" +
  "};\n";

test("empty source yields no tokens", () =>
  check(tsLex(""), toEqual([])));

test("(round-trip) token texts concatenate back to the exact source", () =>
  all([
    check(rejoin(SNIPPET), toBe(SNIPPET)),
    check(
      rejoin("let n = 0x1f + 42n;"),
      toBe("let n = 0x1f + 42n;"),
    ),
    check(
      rejoin('const s = "a\\"b";'),
      toBe('const s = "a\\"b";'),
    ),
  ]));

test("a representative snippet classifies keywords, identifiers, punctuation, comments, templates", () =>
  all([
    check(kindsOf(SNIPPET), toContain("Keyword")),
    check(
      kindsOf(SNIPPET),
      toContain("Identifier"),
    ),
    check(
      kindsOf(SNIPPET),
      toContain("Punctuation"),
    ),
    check(kindsOf(SNIPPET), toContain("Comment")),
    check(
      kindsOf(SNIPPET),
      toContain("Template"),
    ),
  ]));

test("numbers and strings are classified", () =>
  all([
    check(
      kindsOf("let n = 42;"),
      toContain("Number"),
    ),
    check(
      kindsOf('let s = "hi";'),
      toContain("String"),
    ),
    check(
      kindsOf("let h = 0xff;"),
      toContain("Number"),
    ),
  ]));

test("(edge: nested templates) ${} interpolation stays balanced and round-trips", () =>
  all([
    check(rejoin("`a${b}c`"), toBe("`a${b}c`")),
    check(
      kindsOf("`a${b}c`"),
      toContain("Template"),
    ),
    // the interpolated identifier is lexed inside ${}
    check(
      kindsOf("`a${b}c`"),
      toContain("Identifier"),
    ),
    // nested template inside an interpolation
    check(
      rejoin("`${`x${y}z`}`"),
      toBe("`${`x${y}z`}`"),
    ),
    // interpolation containing a brace-block (object literal)
    check(
      rejoin("`${ {a:1} }`"),
      toBe("`${ {a:1} }`"),
    ),
  ]));

test("(edge: regex vs division) `/` is disambiguated by context", () =>
  all([
    // operator position -> regex literal
    check(
      kindsOf("/re/g.test(x)"),
      toContain("Regex"),
    ),
    check(
      kindsOf("return /re/"),
      toContain("Regex"),
    ),
    check(
      kindsOf("x = /a\\/b/"),
      toContain("Regex"),
    ),
    // after a value -> division, never a regex
    check(hasKind("a / b", "Regex"), toBe(false)),
    check(
      hasKind("a / b / c", "Regex"),
      toBe(false),
    ),
    check(
      hasKind("(a) / b", "Regex"),
      toBe(false),
    ),
    // division still round-trips
    check(rejoin("a / b / c"), toBe("a / b / c")),
    check(
      rejoin("/re/g.test(x)"),
      toBe("/re/g.test(x)"),
    ),
  ]));

test("(edge: unterminated at EOF) constructs degrade to plain without throwing", () =>
  all([
    // unterminated block comment
    check(rejoin("/* oops"), toBe("/* oops")),
    check(
      hasKind("/* oops", "Plain"),
      toBe(true),
    ),
    // unterminated string
    check(
      rejoin('let s = "oops'),
      toBe('let s = "oops'),
    ),
    // unterminated template
    check(rejoin("`oops"), toBe("`oops")),
    // unterminated interpolation
    check(rejoin("`a${b"), toBe("`a${b")),
  ]));

test("(known limitation) non-ASCII identifiers lex as Plain but still round-trip", () =>
  all([
    check(
      rejoin("const 漢 = 1"),
      toBe("const 漢 = 1"),
    ),
    check(
      hasKind("const 漢 = 1", "Plain"),
      toBe(true),
    ),
  ]));
