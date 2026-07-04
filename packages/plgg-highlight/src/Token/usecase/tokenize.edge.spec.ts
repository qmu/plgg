import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { SoftStr } from "plgg";
import { tokenize } from "plgg-highlight/Token/usecase/tokenize";

/**
 * Edge cases for the plgg-parser-backed tokenizer, kept
 * separate so the legacy {@link tokenize} regression suite
 * (`tokenize.spec.ts`) stays byte-identical. Covers the
 * three hard cases the compiler scanner handled internally:
 * nested template interpolation, regex-vs-division context,
 * and unterminated constructs degrading to plain at EOF.
 */

const kindsOf = (
  src: SoftStr,
): ReadonlyArray<SoftStr> =>
  tokenize(src).map((t) => t.content.kind.__tag);

const rejoin = (src: SoftStr): SoftStr =>
  tokenize(src)
    .map((t) => t.content.text)
    .join("");

const hasKind = (
  src: SoftStr,
  kind: SoftStr,
): boolean => kindsOf(src).includes(kind);

test("nested template interpolation stays balanced and round-trips", () =>
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
    // interpolation holding an object-literal brace block
    check(
      rejoin("`${ {a:1} }`"),
      toBe("`${ {a:1} }`"),
    ),
  ]));

test("regex vs division is disambiguated by context", () =>
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
    // regex with an escaped slash and a char class
    check(
      kindsOf("x = /a\\/b/"),
      toContain("Regex"),
    ),
    check(
      kindsOf("x = /[/]/g"),
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
    // division still round-trips exactly
    check(rejoin("a / b / c"), toBe("a / b / c")),
    check(
      rejoin("/re/g.test(x)"),
      toBe("/re/g.test(x)"),
    ),
  ]));

test("unterminated constructs at EOF degrade to plain without throwing", () =>
  all([
    check(rejoin("/* oops"), toBe("/* oops")),
    check(
      hasKind("/* oops", "Plain"),
      toBe(true),
    ),
    check(
      rejoin('let s = "oops'),
      toBe('let s = "oops'),
    ),
    check(rejoin("`oops"), toBe("`oops")),
    check(rejoin("`a${b"), toBe("`a${b")),
  ]));

test("numeric literals cover separators, bigint, and prefixes", () =>
  all([
    check(
      kindsOf("let n = 1_000;"),
      toContain("Number"),
    ),
    check(
      kindsOf("let b = 42n;"),
      toContain("Number"),
    ),
    check(
      kindsOf("let h = 0xff;"),
      toContain("Number"),
    ),
    check(
      kindsOf("let e = 1.5e10;"),
      toContain("Number"),
    ),
    check(
      rejoin("const x = 0b1010 + 1_000n;"),
      toBe("const x = 0b1010 + 1_000n;"),
    ),
  ]));

test("(known limitation) non-ASCII identifiers colour as plain but round-trip", () =>
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
