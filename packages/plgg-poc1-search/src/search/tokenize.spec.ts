import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { tokenize } from "./tokenize.js";

test("latin runs tokenize unchanged", () =>
  all([
    check(
      tokenize("Option, not NULL — use plgg!"),
      toEqual([
        "option",
        "not",
        "null",
        "use",
        "plgg",
      ]),
    ),
    // The strategy only affects CJK; latin runs are
    // identical under every strategy.
    check(
      tokenize("Result over throw", "bigram"),
      toEqual(["result", "over", "throw"]),
    ),
  ]));

test("latin-only drops Japanese entirely (the regression Ticket B removes)", () =>
  all([
    // The default and explicit "none" both index a
    // Japanese document to zero tokens.
    check(tokenize("型駆動設計"), toEqual([])),
    check(
      tokenize("型駆動設計", "none"),
      toEqual([]),
    ),
  ]));

test("bigram segments CJK runs into overlapping 2-grams", () =>
  all([
    check(
      tokenize("型駆動", "bigram"),
      toEqual(["型駆", "駆動"]),
    ),
    // A one- or two-character run is its own token.
    check(
      tokenize("駆", "bigram"),
      toEqual(["駆"]),
    ),
    // Mixed input: the latin tokens first, then the CJK
    // bigrams — both spans are indexed.
    check(
      tokenize("Option 型駆動", "bigram"),
      toEqual(["option", "型駆", "駆動"]),
    ),
  ]));

test("both CJK strategies index Japanese to >0 tokens", () =>
  all([
    check(
      tokenize(
        "型駆動設計とエスケープハッチ",
        "segmenter",
      ).length > 0,
      toBe(true),
    ),
    check(
      tokenize(
        "型駆動設計とエスケープハッチ",
        "bigram",
      ).length > 0,
      toBe(true),
    ),
    // Every emitted token is a non-empty string.
    check(
      tokenize(
        "情報セキュリティ",
        "segmenter",
      ).every((t) => t.length >= 1),
      toBe(true),
    ),
  ]));
