import {
  SoftStr,
  Option,
  ok,
  err,
  isOk,
  some,
  none,
  pipe,
  getOr,
  matchOption,
  matchResult,
  fromNullable,
} from "plgg";
import {
  Parser,
  ParseState,
  parsed,
  parseError,
  run,
  satisfy,
  anyChar,
  whitespace,
  letter,
  alphaNum,
  char,
  literal,
  oneOf,
  noneOf,
  succeed,
  map,
  andThen,
  seq,
  right,
  or,
  many,
  many1,
  optional,
  notFollowedBy,
  getUserState,
  setUserState,
} from "plgg-parser";
import {
  Token,
  TokenKind,
  token,
  keyword,
  stringKind,
  numberKind,
  comment,
  identifier,
  punctuation,
  regex,
  template,
  plain,
} from "plgg-highlight/Token/model/Token";
import {
  LexState,
  Category,
  initLexState,
  nextRegexAllowed,
} from "plgg-highlight/Token/model/LexState";

/**
 * Tokenize TypeScript-family source into a classified
 * {@link Token} stream with a grammar built on
 * `plgg-parser` — the in-house replacement for the old
 * `ts.createScanner` loop, so no `typescript` runtime/peer
 * dependency is needed to highlight `<pre>` code.
 *
 * Contract preserved from the scanner era:
 * `skipTrivia`-equivalent — every character of input lands
 * in exactly one token, so the tokens' `text` concatenates
 * back to the exact source. Never throws: irregular input
 * (unterminated constructs, non-ASCII, non-code) degrades to
 * {@link plain} tokens rather than rejecting.
 *
 * Known limitations vs. the compiler scanner (cosmetic —
 * only affect coloring, never the round-trip): non-ASCII /
 * `\u`-escaped identifiers colour as `plain`; JSX/TSX markup
 * is lexed generically (the scanner was lexical-only here
 * too); numeric literals cover decimal (with `_` separators,
 * fraction, exponent, bigint `n`) and `0x`/`0b`/`0o`
 * prefixes.
 */

// ---------------------------------------------------------
// Concrete-state primitives — pin the state-polymorphic
// library primitives to this grammar's LexState by direct
// assignment (an annotation, never a cast); the combinators
// then infer S = LexState from these leaves.
// ---------------------------------------------------------

const anyC: Parser<SoftStr, LexState> = anyChar;
const ws: Parser<SoftStr, LexState> = whitespace;
const let_: Parser<SoftStr, LexState> = letter;
const alnum: Parser<SoftStr, LexState> = alphaNum;

const chr = (
  c: SoftStr,
): Parser<SoftStr, LexState> => char(c);
const lit = (
  s: SoftStr,
): Parser<SoftStr, LexState> => literal(s);
const oneOfC = (
  s: SoftStr,
): Parser<SoftStr, LexState> => oneOf(s);
const noneOfC = (
  s: SoftStr,
): Parser<SoftStr, LexState> => noneOf(s);
const sat = (
  label: SoftStr,
  pred: (c: SoftStr) => boolean,
): Parser<SoftStr, LexState> =>
  satisfy(label, pred);

const joinChars = (
  cs: ReadonlyArray<SoftStr>,
): SoftStr => cs.join("");

const textOf = (
  p: Parser<ReadonlyArray<SoftStr>, LexState>,
): Parser<SoftStr, LexState> =>
  pipe(p, map(joinChars));

const optText = (
  p: Parser<SoftStr, LexState>,
): Parser<SoftStr, LexState> =>
  pipe(
    optional(p),
    map(
      (o: Option<SoftStr>): SoftStr =>
        getOr("")(o),
    ),
  );

// ---------------------------------------------------------
// Emission: build a Token AND thread the regex-vs-division
// context. `category` is `None` for trivia (context
// unchanged) and `Some` for a significant lexeme.
// ---------------------------------------------------------

const keepContext: Parser<true, LexState> =
  succeed(true);

const emit =
  (kind: TokenKind, category: Option<Category>) =>
  (
    text: SoftStr,
  ): Parser<ReadonlyArray<Token>, LexState> =>
    right(
      pipe(
        category,
        matchOption(
          (): Parser<true, LexState> =>
            keepContext,
          (
            cat: Category,
          ): Parser<true, LexState> =>
            setUserState(
              (): LexState => ({
                regexAllowed: nextRegexAllowed(
                  cat,
                  text,
                ),
              }),
            ),
        ),
      ),
      succeed([token(kind, text)]),
    );

const trivia = (kind: TokenKind) =>
  emit(kind, none());

const signif = (kind: TokenKind, cat: Category) =>
  emit(kind, some(cat));

// ---------------------------------------------------------
// Whitespace and comments (trivia)
// ---------------------------------------------------------

const wsToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  textOf(many1(ws)),
  andThen(trivia(plain())),
);

const lineComment: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  textOf(
    seq([lit("//"), textOf(many(noneOfC("\n")))]),
  ),
  andThen(trivia(comment())),
);

const emitBlock = (
  open: SoftStr,
  body: SoftStr,
  close: Option<SoftStr>,
): Parser<ReadonlyArray<Token>, LexState> =>
  pipe(
    close,
    matchOption(
      (): Parser<
        ReadonlyArray<Token>,
        LexState
      > => trivia(plain())(open + body),
      (
        c: SoftStr,
      ): Parser<ReadonlyArray<Token>, LexState> =>
        trivia(comment())(open + body + c),
    ),
  );

const blockComment: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  lit("/*"),
  andThen((open: SoftStr) =>
    pipe(
      textOf(
        many(
          right(notFollowedBy(lit("*/")), anyC),
        ),
      ),
      andThen((body: SoftStr) =>
        pipe(
          optional(lit("*/")),
          andThen((close: Option<SoftStr>) =>
            emitBlock(open, body, close),
          ),
        ),
      ),
    ),
  ),
);

// ---------------------------------------------------------
// Strings
// ---------------------------------------------------------

const escaped: Parser<SoftStr, LexState> = textOf(
  seq([chr("\\"), anyC]),
);

const stringChar = (
  quote: SoftStr,
): Parser<SoftStr, LexState> =>
  or(
    escaped,
    sat(
      "string char",
      (c: SoftStr): boolean =>
        c !== quote && c !== "\\" && c !== "\n",
    ),
  );

const emitString = (
  open: SoftStr,
  body: SoftStr,
  close: Option<SoftStr>,
): Parser<ReadonlyArray<Token>, LexState> =>
  pipe(
    close,
    matchOption(
      (): Parser<
        ReadonlyArray<Token>,
        LexState
      > => trivia(plain())(open + body),
      (
        c: SoftStr,
      ): Parser<ReadonlyArray<Token>, LexState> =>
        signif(
          stringKind(),
          "value",
        )(open + body + c),
    ),
  );

const stringToken = (
  quote: SoftStr,
): Parser<ReadonlyArray<Token>, LexState> =>
  pipe(
    chr(quote),
    andThen((open: SoftStr) =>
      pipe(
        textOf(many(stringChar(quote))),
        andThen((body: SoftStr) =>
          pipe(
            optional(chr(quote)),
            andThen((close: Option<SoftStr>) =>
              emitString(open, body, close),
            ),
          ),
        ),
      ),
    ),
  );

// ---------------------------------------------------------
// Numbers (decimal w/ separators, fraction, exponent,
// bigint n; 0x / 0b / 0o prefixes)
// ---------------------------------------------------------

const decRun: Parser<SoftStr, LexState> = textOf(
  many1(oneOfC("0123456789_")),
);

const exponent: Parser<SoftStr, LexState> =
  textOf(
    seq([
      oneOfC("eE"),
      optText(oneOfC("+-")),
      decRun,
    ]),
  );

const prefixedNumber: Parser<SoftStr, LexState> =
  textOf(
    seq([
      textOf(seq([chr("0"), oneOfC("xXbBoO")])),
      textOf(
        many1(
          sat(
            "digit",
            (c: SoftStr): boolean =>
              (c >= "0" && c <= "9") ||
              (c >= "a" && c <= "f") ||
              (c >= "A" && c <= "F") ||
              c === "_",
          ),
        ),
      ),
      optText(chr("n")),
    ]),
  );

const decimalNumber: Parser<SoftStr, LexState> =
  textOf(
    seq([
      decRun,
      optText(textOf(seq([chr("."), decRun]))),
      optText(exponent),
      optText(chr("n")),
    ]),
  );

const numberToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  or(prefixedNumber, decimalNumber),
  andThen(signif(numberKind(), "value")),
);

// ---------------------------------------------------------
// Identifiers and keywords
// ---------------------------------------------------------

/** The TS keyword/reserved-word set the highlighter colours. */
const KEYWORDS: ReadonlyArray<SoftStr> = [
  "abstract",
  "accessor",
  "any",
  "as",
  "asserts",
  "async",
  "await",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "module",
  "namespace",
  "never",
  "new",
  "null",
  "number",
  "object",
  "of",
  "out",
  "override",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "set",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "unknown",
  "var",
  "void",
  "while",
  "with",
  "yield",
];

const isKeyword = (word: SoftStr): boolean =>
  KEYWORDS.includes(word);

const identStart: Parser<SoftStr, LexState> = or(
  let_,
  oneOfC("_$#"),
);

const identPart: Parser<SoftStr, LexState> = or(
  alnum,
  oneOfC("_$"),
);

const identText: Parser<SoftStr, LexState> =
  textOf(
    seq([identStart, textOf(many(identPart))]),
  );

const wordToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  identText,
  andThen((word: SoftStr) =>
    isKeyword(word)
      ? signif(keyword(), "keyword")(word)
      : signif(identifier(), "value")(word),
  ),
);

// ---------------------------------------------------------
// Regex vs. division (context-sensitive on the user-state)
// ---------------------------------------------------------

/** A `[...]` character class, so `/[/]/` does not close early. */
const regexClass: Parser<SoftStr, LexState> =
  textOf(
    seq([
      chr("["),
      textOf(many(or(escaped, noneOfC("]\n")))),
      chr("]"),
    ]),
  );

const regexAtom: Parser<SoftStr, LexState> = or(
  escaped,
  regexClass,
  sat(
    "regex char",
    (c: SoftStr): boolean =>
      c !== "/" && c !== "\n" && c !== "[",
  ),
);

const regexText: Parser<SoftStr, LexState> =
  textOf(
    seq([
      chr("/"),
      textOf(many1(regexAtom)),
      chr("/"),
      textOf(many(let_)),
    ]),
  );

const regexToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  regexText,
  andThen(signif(regex(), "value")),
);

const divisionToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  or(lit("/="), chr("/")),
  andThen(signif(punctuation(), "punct")),
);

const slashToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  getUserState,
  andThen((st: LexState) =>
    st.regexAllowed
      ? or(regexToken, divisionToken)
      : divisionToken,
  ),
);

// ---------------------------------------------------------
// Operators and punctuation
// ---------------------------------------------------------

/** Multi-char operators, longest-first so `===` beats `==`. */
const MULTI_OPS: ReadonlyArray<SoftStr> = [
  "...",
  "=>",
  "===",
  "!==",
  "**=",
  "&&=",
  "||=",
  "??=",
  ">>>",
  "<<=",
  ">>=",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "?.",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "%=",
  "&=",
  "|=",
  "^=",
  "**",
  "<<",
  ">>",
];

const opToken: Parser<SoftStr, LexState> = or(
  ...MULTI_OPS.map(
    (o: SoftStr): Parser<SoftStr, LexState> =>
      lit(o),
  ),
);

const singlePunct: Parser<SoftStr, LexState> =
  oneOfC("{}()[];:,.<>=+-*!&|^~?@%");

const punctToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(
  or(opToken, singlePunct),
  andThen(signif(punctuation(), "punct")),
);

/** Last resort: any single char as plain, so the lexer is total. */
const fallbackToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = pipe(anyC, andThen(trivia(plain())));

// ---------------------------------------------------------
// Template literals (the one seam: a `${…}` rescan)
// ---------------------------------------------------------

const charAt = (
  source: SoftStr,
  i: number,
): SoftStr =>
  pipe(fromNullable(source[i]), getOr(""));

const mkState = (
  source: SoftStr,
  position: number,
  userState: LexState,
): ParseState<LexState> => ({
  source,
  position,
  userState,
});

const isBraceTok = (
  produced: ReadonlyArray<Token>,
  ch: SoftStr,
): boolean =>
  produced.length === 1 &&
  pipe(
    fromNullable(produced[0]),
    matchOption(
      (): boolean => false,
      (t: Token): boolean =>
        t.content.text === ch,
    ),
  );

/**
 * Lex a template literal, recursively re-entering the token
 * grammar for each `${…}` interpolation with brace-depth
 * tracking. Documented imperative seam: a template rescan is
 * a stateful cursor with no pure-expression form — a local
 * cursor + push accumulators, confined here (the same
 * grandfathered exception the old scanner loop relied on).
 * The interpolation body is lexed by the combinator
 * {@link oneToken}, so a nested template recurses back here.
 * An unterminated template degrades its trailing chunk to
 * {@link plain} (never a throw).
 */
const lexTemplate: Parser<
  ReadonlyArray<Token>,
  LexState
> = (state) => {
  const source = state.source;
  const n = source.length;
  // Guard: only a backtick opens a template; without it the
  // seam would "succeed" on any input, advancing forever.
  if (charAt(source, state.position) !== "`") {
    return err(
      parseError(
        "expected template literal",
        state.position,
      ),
    );
  }
  const tokens: Array<Token> = [];
  let pos = state.position;
  let chunk = charAt(source, pos); // opening backtick
  pos = pos + 1;
  for (;;) {
    if (pos >= n) {
      // Unterminated at EOF: degrade the chunk to plain.
      tokens.push(token(plain(), chunk));
      return ok(
        parsed(
          tokens,
          mkState(source, pos, state.userState),
        ),
      );
    }
    const c = charAt(source, pos);
    if (c === "\\") {
      chunk = chunk + c + charAt(source, pos + 1);
      pos = pos + 2;
      continue;
    }
    if (c === "`") {
      chunk = chunk + c;
      pos = pos + 1;
      tokens.push(token(template(), chunk));
      // A template is a value — regex not allowed after it.
      return ok(
        parsed(
          tokens,
          mkState(source, pos, {
            regexAllowed: false,
          }),
        ),
      );
    }
    if (
      c === "$" &&
      charAt(source, pos + 1) === "{"
    ) {
      chunk = chunk + "${";
      pos = pos + 2;
      tokens.push(token(template(), chunk));
      let depth = 1;
      let cur = mkState(source, pos, {
        regexAllowed: true,
      });
      for (;;) {
        if (cur.position >= n) {
          return ok(parsed(tokens, cur));
        }
        if (
          charAt(source, cur.position) === "}" &&
          depth === 1
        ) {
          chunk = "}";
          pos = cur.position + 1;
          break;
        }
        const step = oneToken(cur);
        if (!isOk(step)) {
          return ok(parsed(tokens, cur));
        }
        const produced = step.content.value;
        for (const t of produced) {
          tokens.push(t);
        }
        if (isBraceTok(produced, "{")) {
          depth = depth + 1;
        }
        if (isBraceTok(produced, "}")) {
          depth = depth - 1;
        }
        cur = step.content.state;
      }
      continue;
    }
    chunk = chunk + c;
    pos = pos + 1;
  }
};

// ---------------------------------------------------------
// Assembly
// ---------------------------------------------------------

/**
 * Lex one token (one or more {@link Token}s — templates emit
 * several). Ordered choice; comments precede `slashToken` so
 * `//` and `/*` win over regex/division, and `fallbackToken`
 * makes the choice total on any non-empty input.
 */
const oneToken: Parser<
  ReadonlyArray<Token>,
  LexState
> = or(
  wsToken,
  lineComment,
  blockComment,
  lexTemplate,
  stringToken('"'),
  stringToken("'"),
  numberToken,
  slashToken,
  wordToken,
  punctToken,
  fallbackToken,
);

const flatten = (
  groups: ReadonlyArray<ReadonlyArray<Token>>,
): ReadonlyArray<Token> =>
  groups.flatMap((g: ReadonlyArray<Token>) => g);

/**
 * Tokenize source into a classified token stream. Total:
 * `oneToken` consumes every character (down to a `plain`
 * fallback), so the parse always succeeds — the
 * `matchResult` failure arm is a defensive net yielding the
 * whole input as one `plain` token, never a throw.
 */
export const tokenize = (
  code: SoftStr,
): ReadonlyArray<Token> =>
  pipe(
    run(
      pipe(many(oneToken), map(flatten)),
      code,
      initLexState,
    ),
    matchResult(
      (): ReadonlyArray<Token> => [
        token(plain(), code),
      ],
      (toks: ReadonlyArray<Token>) => toks,
    ),
  );
