import {
  test,
  check,
  all,
  toEqual,
  toHaveLength,
} from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import {
  lParenTok,
  rParenTok,
  symbolTok,
  strTok,
  numTok,
  boolTok,
} from "plgg-ir-syntax/domain/model/Token";
import { tokenize } from "plgg-ir-syntax/domain/usecase/tokenize";

test("tokenizes parens and a symbol with exact ranges", () =>
  check(
    tokenize("(a)"),
    toEqual({
      tokens: [
        lParenTok(
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(1, 1, 2),
          ),
        ),
        symbolTok(
          "a",
          sourceRange(
            sourcePos(1, 1, 2),
            sourcePos(2, 1, 3),
          ),
        ),
        rParenTok(
          sourceRange(
            sourcePos(2, 1, 3),
            sourcePos(3, 1, 4),
          ),
        ),
      ],
      diagnostics: [],
    }),
  ));

test("tracks line/column across newlines", () =>
  check(
    tokenize("(a\n b)").tokens[2],
    toEqual(
      symbolTok(
        "b",
        sourceRange(
          sourcePos(4, 2, 2),
          sourcePos(5, 2, 3),
        ),
      ),
    ),
  ));

test("classifies atoms: booleans, numbers, symbols", () =>
  check(
    tokenize(
      "true false 42 -2 3.14 1e5 2E+8 5e-3 entity length-between >= . Abc",
    ),
    toEqual({
      tokens: [
        boolTok(
          true,
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(4, 1, 5),
          ),
        ),
        boolTok(
          false,
          sourceRange(
            sourcePos(5, 1, 6),
            sourcePos(10, 1, 11),
          ),
        ),
        numTok(
          42,
          sourceRange(
            sourcePos(11, 1, 12),
            sourcePos(13, 1, 14),
          ),
        ),
        numTok(
          -2,
          sourceRange(
            sourcePos(14, 1, 15),
            sourcePos(16, 1, 17),
          ),
        ),
        numTok(
          3.14,
          sourceRange(
            sourcePos(17, 1, 18),
            sourcePos(21, 1, 22),
          ),
        ),
        numTok(
          100000,
          sourceRange(
            sourcePos(22, 1, 23),
            sourcePos(25, 1, 26),
          ),
        ),
        numTok(
          200000000,
          sourceRange(
            sourcePos(26, 1, 27),
            sourcePos(30, 1, 31),
          ),
        ),
        numTok(
          0.005,
          sourceRange(
            sourcePos(31, 1, 32),
            sourcePos(35, 1, 36),
          ),
        ),
        symbolTok(
          "entity",
          sourceRange(
            sourcePos(36, 1, 37),
            sourcePos(42, 1, 43),
          ),
        ),
        symbolTok(
          "length-between",
          sourceRange(
            sourcePos(43, 1, 44),
            sourcePos(57, 1, 58),
          ),
        ),
        symbolTok(
          ">=",
          sourceRange(
            sourcePos(58, 1, 59),
            sourcePos(60, 1, 61),
          ),
        ),
        symbolTok(
          ".",
          sourceRange(
            sourcePos(61, 1, 62),
            sourcePos(62, 1, 63),
          ),
        ),
        symbolTok(
          "Abc",
          sourceRange(
            sourcePos(63, 1, 64),
            sourcePos(66, 1, 67),
          ),
        ),
      ],
      diagnostics: [],
    }),
  ));

test("decodes the closed escape set in strings", () =>
  check(
    tokenize('"a\\"b\\\\c\\nd\\te\\rf"'),
    toEqual({
      tokens: [
        strTok(
          'a"b\\c\nd\te\rf',
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(18, 1, 19),
          ),
        ),
      ],
      diagnostics: [],
    }),
  ));

test("an invalid escape diagnoses and keeps the character", () =>
  all([
    check(
      tokenize('"a\\qb"').tokens,
      toEqual([
        strTok(
          "aqb",
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(6, 1, 7),
          ),
        ),
      ]),
    ),
    check(
      tokenize('"a\\qb"').diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.invalid-escape"]),
    ),
  ]));

test("an unterminated string diagnoses at end of input", () =>
  all([
    check(
      tokenize('"abc').diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.unterminated-string"]),
    ),
    check(
      tokenize('"abc').tokens,
      toHaveLength(1),
    ),
  ]));

test("an unterminated string diagnoses at a raw newline", () =>
  check(
    tokenize('"abc\ndef').diagnostics.map(
      (d) => d.code,
    ),
    // the string closes at the newline; `def` lexes on
    toEqual(["syntax.unterminated-string"]),
  ));

test("a trailing backslash is an unterminated string", () =>
  check(
    tokenize('"abc\\').diagnostics.map(
      (d) => d.code,
    ),
    toEqual(["syntax.unterminated-string"]),
  ));

test("a malformed number diagnoses and recovers as a symbol", () =>
  all([
    check(
      tokenize("1abc").tokens,
      toEqual([
        symbolTok(
          "1abc",
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(4, 1, 5),
          ),
        ),
      ]),
    ),
    check(
      tokenize("1abc").diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.invalid-number"]),
    ),
    check(
      tokenize("1.").diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.invalid-number"]),
    ),
    // an overflowing exponent is not a finite number
    check(
      tokenize("1e999").diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.invalid-number"]),
    ),
    check(
      tokenize("-5x").diagnostics.map(
        (d) => d.code,
      ),
      toEqual(["syntax.invalid-number"]),
    ),
  ]));

test("an unexpected character diagnoses and is skipped", () =>
  all([
    check(
      tokenize("a @ b").tokens.map(
        (t) => t.__tag,
      ),
      toEqual(["SymbolTok", "SymbolTok"]),
    ),
    check(
      tokenize("a @ b").diagnostics,
      toEqual([
        {
          code: "syntax.unexpected-character",
          severity: "error",
          message: 'unexpected character "@"',
          range: sourceRange(
            sourcePos(2, 1, 3),
            sourcePos(3, 1, 4),
          ),
        },
      ]),
    ),
  ]));

test("comments and whitespace are trivia", () =>
  all([
    check(
      tokenize(
        "; heading\n(a) ; trailing\n; tail",
      ).tokens.map((t) => t.__tag),
      toEqual([
        "LParenTok",
        "SymbolTok",
        "RParenTok",
      ]),
    ),
    check(
      tokenize("; only a comment").tokens,
      toEqual([]),
    ),
    check(tokenize("").tokens, toEqual([])),
    check(
      tokenize("  \t\r\n ").diagnostics,
      toEqual([]),
    ),
  ]));

test("diagnostics accumulate across one scan", () =>
  check(
    tokenize('@ 1x "\\q').diagnostics.map(
      (d) => d.code,
    ),
    toEqual([
      "syntax.unexpected-character",
      "syntax.invalid-number",
      "syntax.invalid-escape",
      "syntax.unterminated-string",
    ]),
  ));
