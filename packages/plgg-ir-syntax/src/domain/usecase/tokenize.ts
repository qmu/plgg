import {
  SoftStr,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  isErr,
  mapResult,
  matchOption,
  fromNullable,
} from "plgg";
import {
  Parser,
  Parsed,
  parsed,
  initState,
  advance,
  putUserState,
  parseError,
  satisfy,
  char,
  anyChar,
  noneOf,
  whitespace,
  many,
  many1,
  or,
  right,
  map,
  andThen,
  succeed,
  setUserState,
} from "plgg-parser";
import {
  LineIndex,
  buildLineIndex,
  rangeAt,
} from "plgg-ir-syntax/domain/model/LineIndex";
import { SourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import {
  SyntaxDiagnostic,
  syntaxError,
  codeUnexpectedCharacter,
  codeUnterminatedString,
  codeInvalidEscape,
  codeInvalidNumber,
} from "plgg-ir-syntax/domain/model/SyntaxDiagnostic";
import {
  Token,
  lParenTok,
  rParenTok,
  symbolTok,
  strTok,
  numTok,
  boolTok,
} from "plgg-ir-syntax/domain/model/Token";

/**
 * The tokenizer's user-state slot: the syntax
 * diagnostics accumulated so far. Lexical errors never
 * abort the scan — they ride along here so one pass
 * reports every problem (design.md §35).
 */
type LexState = ReadonlyArray<SyntaxDiagnostic>;

/**
 * What {@link tokenize} produces: every token in the
 * source plus every lexical diagnostic. Recovery is
 * built in — an unexpected character is skipped with a
 * diagnostic, so `tokens` is always the best-effort
 * reading of the whole source.
 */
export type Tokenized = Readonly<{
  tokens: ReadonlyArray<Token>;
  diagnostics: ReadonlyArray<SyntaxDiagnostic>;
}>;

/**
 * Wraps a parser so its produced value is combined with
 * the {@link SourceRange} it consumed — how every token
 * learns its position without threading offsets by
 * hand.
 */
const spanned =
  <A, B>(
    index: LineIndex,
    build: (value: A, range: SourceRange) => B,
  ) =>
  (
    parser: Parser<A, LexState>,
  ): Parser<B, LexState> =>
  (state) =>
    pipe(
      parser(state),
      mapResult(
        (
          p: Parsed<A, LexState>,
        ): Parsed<B, LexState> =>
          parsed(
            build(
              p.value,
              rangeAt(index)(
                state.position,
                p.state.position,
              ),
            ),
            p.state,
          ),
      ),
    );

/**
 * A parser that appends one diagnostic to the lex
 * state, consuming nothing.
 */
const appendDiag = (
  diagnostic: SyntaxDiagnostic,
): Parser<true, LexState> =>
  setUserState<LexState>((diags) => [
    ...diags,
    diagnostic,
  ]);

/**
 * The punctuation characters a symbol may contain, on
 * top of ASCII letters and digits. A closed alphabet —
 * anything else is `syntax.unexpected-character`
 * (design.md §34: a small, regular grammar the LLM
 * cannot drift out of silently). The leading `:` marks
 * an attribute keyword (`:ロジック`, `:接続元`, …) in the
 * thesis dialect (design.md §4); it is admitted as an
 * ordinary atom character so a keyword scans as one
 * symbol whose name begins with `:`. The arrow `→`
 * (U+2192) is admitted for the thesis requirement path
 * atom `前提→ルート` (design.md §4); like the Japanese
 * letters it is a single BMP code unit.
 */
const ATOM_PUNCT = "-+*/<>=!?._:→";

/**
 * True when `ch` is one of the metamodel's Japanese
 * letters admitted into the atom alphabet: hiragana
 * (U+3040–U+309F), katakana including the prolonged
 * sound mark ー (U+30A0–U+30FF), and CJK unified
 * ideographs (U+4E00–U+9FFF). A *closed* extension of
 * the ASCII alphabet — the thesis dialect's Japanese
 * vocabulary (design.md §4), never "any Unicode".
 *
 * All three ranges lie in the Basic Multilingual Plane,
 * so each character is exactly one UTF-16 code unit; the
 * scanner's per-unit `advance(1)` therefore coincides
 * with per-code-point advancement and {@link SourceRange}
 * offsets stay code-point-consistent for this alphabet.
 */
const isJapaneseLetter = (
  ch: SoftStr,
): boolean =>
  pipe(
    fromNullable(ch.codePointAt(0)),
    matchOption(
      (): boolean => false,
      (cp: number): boolean =>
        (cp >= 0x3040 && cp <= 0x309f) ||
        (cp >= 0x30a0 && cp <= 0x30ff) ||
        (cp >= 0x4e00 && cp <= 0x9fff),
    ),
  );

/**
 * One character of a bare atom (symbol / number /
 * boolean lexeme). Pinned to the concrete
 * {@link LexState} so the generic combinators
 * instantiate against it (a bare generic-to-generic
 * composition would infer `unknown`).
 */
const atomChar: Parser<SoftStr, LexState> =
  satisfy(
    "atom character",
    (ch: SoftStr): boolean =>
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      (ch >= "0" && ch <= "9") ||
      ATOM_PUNCT.includes(ch) ||
      isJapaneseLetter(ch),
  );

/**
 * A `;` (pinned to {@link LexState}, see
 * {@link atomChar}).
 */
const semi: Parser<SoftStr, LexState> = char(";");

/**
 * Any character but a newline (pinned to
 * {@link LexState}).
 */
const nonNewline: Parser<SoftStr, LexState> =
  noneOf("\n");

/**
 * One whitespace character (pinned to
 * {@link LexState}).
 */
const ws: Parser<SoftStr, LexState> = whitespace;

/**
 * A `;` line comment (to end of line, exclusive).
 */
const comment: Parser<true, LexState> = pipe(
  right(semi, many(nonNewline)),
  map((): true => true),
);

/**
 * Skippable trivia: whitespace and comments. Always
 * succeeds (possibly zero-width).
 */
const trivia: Parser<
  ReadonlyArray<true>,
  LexState
> = many(
  or<true, LexState>(
    pipe(
      ws,
      map((): true => true),
    ),
    comment,
  ),
);

/**
 * A valid integer / decimal literal, with an optional
 * exponent so any finite `String(number)` output
 * re-lexes as the same number (canonical printing
 * round-trips).
 */
const NUMBER_RE =
  /^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

/**
 * A lexeme that *starts* like a number — if it then
 * fails {@link NUMBER_RE} it is a malformed number, not
 * a symbol.
 */
const STARTS_LIKE_NUMBER = /^-?[0-9]/;

/**
 * How one atom lexeme classifies: the token it becomes
 * plus an optional diagnostic (a malformed number
 * recovers as a symbol so reading can continue).
 */
type ClassifiedAtom = Readonly<{
  token: Token;
  diagnostic: Option<SyntaxDiagnostic>;
}>;

/**
 * Classifies an atom lexeme into `true`/`false`, a
 * number, or a symbol. The vocabulary is closed: a
 * digit-leading lexeme that is not a valid finite
 * number is `syntax.invalid-number`.
 */
const classifyAtom = (
  lexeme: SoftStr,
  range: SourceRange,
): ClassifiedAtom =>
  lexeme === "true"
    ? {
        token: boolTok(true, range),
        diagnostic: none(),
      }
    : lexeme === "false"
      ? {
          token: boolTok(false, range),
          diagnostic: none(),
        }
      : NUMBER_RE.test(lexeme) &&
          Number.isFinite(Number(lexeme))
        ? {
            token: numTok(Number(lexeme), range),
            diagnostic: none(),
          }
        : STARTS_LIKE_NUMBER.test(lexeme)
          ? {
              token: symbolTok(lexeme, range),
              diagnostic: some(
                syntaxError(
                  codeInvalidNumber,
                  `invalid number literal ${JSON.stringify(lexeme)}`,
                  range,
                ),
              ),
            }
          : {
              token: symbolTok(lexeme, range),
              diagnostic: none(),
            };

/**
 * One bare atom token (symbol / number / boolean),
 * classified after scanning; a malformed number emits
 * its diagnostic and recovers as a symbol.
 */
const atom = (
  index: LineIndex,
): Parser<Token, LexState> =>
  pipe(
    pipe(
      many1(atomChar),
      map(
        (chs: ReadonlyArray<SoftStr>): SoftStr =>
          chs.join(""),
      ),
    ),
    spanned(index, classifyAtom),
    andThen(
      (
        c: ClassifiedAtom,
      ): Parser<Token, LexState> =>
        pipe(
          c.diagnostic,
          matchOption(
            (): Parser<Token, LexState> =>
              succeed(c.token),
            (
              d: SyntaxDiagnostic,
            ): Parser<Token, LexState> =>
              right(
                appendDiag(d),
                succeed(c.token),
              ),
          ),
        ),
    ),
  );

/**
 * The closed escape set inside string literals.
 */
const ESCAPES: Readonly<Record<string, string>> =
  {
    '"': '"',
    "\\": "\\",
    n: "\n",
    t: "\t",
    r: "\r",
  };

/**
 * A double-quoted string literal token. Decodes the
 * closed escape set; an unknown escape or a string
 * still open at a raw newline / end of input emits a
 * diagnostic and recovers with the value read so far.
 */
const stringLit =
  (index: LineIndex): Parser<Token, LexState> =>
  (state) => {
    if (state.source[state.position] !== '"') {
      return err(
        parseError(
          "expected string literal",
          state.position,
        ),
      );
    }
    // Imperative seam: a scanner-cursor walk over the
    // literal, because the three exits (close quote,
    // unterminated, escape decode) each need the exact
    // cursor offset for their ranges — combinator
    // composition would rebuild that bookkeeping less
    // clearly (mirrors plgg-parser's documented `many`
    // seam).
    let pos = state.position + 1;
    let value = "";
    let diags: LexState = state.userState;
    for (;;) {
      const ch = state.source[pos];
      if (ch === undefined || ch === "\n") {
        const range = rangeAt(index)(
          state.position,
          pos,
        );
        return ok(
          parsed(
            strTok(value, range),
            pipe(
              state,
              advance(pos - state.position),
              putUserState<LexState>([
                ...diags,
                syntaxError(
                  codeUnterminatedString,
                  "string literal is not terminated",
                  range,
                ),
              ]),
            ),
          ),
        );
      }
      if (ch === '"') {
        return ok(
          parsed(
            strTok(
              value,
              rangeAt(index)(
                state.position,
                pos + 1,
              ),
            ),
            pipe(
              state,
              advance(pos + 1 - state.position),
              putUserState(diags),
            ),
          ),
        );
      }
      if (ch === "\\") {
        const esc = state.source[pos + 1];
        const decoded =
          esc === undefined
            ? undefined
            : ESCAPES[esc];
        if (esc === undefined) {
          // backslash at end of input: the next loop
          // turn reports the unterminated string
          pos = pos + 1;
        } else if (decoded === undefined) {
          diags = [
            ...diags,
            syntaxError(
              codeInvalidEscape,
              `invalid escape \\${esc}`,
              rangeAt(index)(pos, pos + 2),
            ),
          ];
          value = value + esc;
          pos = pos + 2;
        } else {
          value = value + decoded;
          pos = pos + 2;
        }
      } else {
        value = value + ch;
        pos = pos + 1;
      }
    }
  };

/**
 * A character no token can start with: emit
 * `syntax.unexpected-character` and skip it, producing
 * no token, so the scan continues.
 */
const skipChar = (
  index: LineIndex,
): Parser<Option<Token>, LexState> =>
  pipe(
    anyChar,
    spanned(
      index,
      (
        ch: SoftStr,
        range: SourceRange,
      ): SyntaxDiagnostic =>
        syntaxError(
          codeUnexpectedCharacter,
          `unexpected character ${JSON.stringify(ch)}`,
          range,
        ),
    ),
    andThen(
      (
        d: SyntaxDiagnostic,
      ): Parser<Option<Token>, LexState> =>
        right(
          appendDiag(d),
          succeed<Option<Token>>(none()),
        ),
    ),
  );

/**
 * One token (or a skipped unexpected character). Fails
 * only at end of input.
 */
const token = (
  index: LineIndex,
): Parser<Option<Token>, LexState> =>
  or<Option<Token>, LexState>(
    pipe(
      or<Token, LexState>(
        pipe(
          char("("),
          spanned(
            index,
            (
              _ch: SoftStr,
              range: SourceRange,
            ): Token => lParenTok(range),
          ),
        ),
        pipe(
          char(")"),
          spanned(
            index,
            (
              _ch: SoftStr,
              range: SourceRange,
            ): Token => rParenTok(range),
          ),
        ),
        stringLit(index),
        atom(index),
      ),
      map((t: Token): Option<Token> => some(t)),
    ),
    skipChar(index),
  );

/**
 * Tokenizes a whole source text into {@link Tokenized}:
 * every token plus every lexical diagnostic. Total —
 * recovery (skip + diagnose) means malformed input
 * still yields the best-effort token stream, never a
 * throw.
 */
export const tokenize = (
  source: SoftStr,
): Tokenized => {
  const step = right(
    trivia,
    token(buildLineIndex(source)),
  );
  // Imperative seam: drive the token parser to end of
  // input. The parser fails exactly when only trivia
  // remains (the skip arm consumes any character), so
  // the failure IS the loop's termination signal —
  // mirrors plgg-parser's documented `many` seam.
  const tokens: Array<Token> = [];
  let state = initState<LexState>(source, []);
  for (;;) {
    const result = step(state);
    if (isErr(result)) {
      return {
        tokens,
        diagnostics: state.userState,
      };
    }
    tokens.push(
      ...pipe(
        result.content.value,
        matchOption(
          (): ReadonlyArray<Token> => [],
          (t: Token): ReadonlyArray<Token> => [t],
        ),
      ),
    );
    state = result.content.state;
  }
};
