import {
  SoftStr,
  Option,
  ok,
  err,
  isOk,
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
  digit,
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
} from "plgg-parser/Parse";
import {
  Tok,
  TokTag,
  tokKind,
  tok,
} from "plgg-parser/Demo/model/Tok";
import {
  LexState,
  initLexState,
  nextRegexAllowed,
} from "plgg-parser/Demo/model/LexState";

/**
 * The TS-lexer demo: a TypeScript lexer built ENTIRELY from
 * the `plgg-parser` combinators, proving the core can lex the
 * `<pre>`-wrapped source `plgg-highlight` highlights — the
 * eventual in-house replacement for its `ts.createScanner`.
 *
 * It is spec/demo code, not the shipped API: the production
 * TS grammar lands in `plgg-highlight` with the migration
 * ticket. Known demo limitations (out of the gate): Unicode
 * identifiers / `\u` escapes are lexed char-by-char as
 * `Plain`; regex character classes (`/[/]/`) are not
 * special-cased; numeric literals cover decimals, bigint
 * `n`, and the lowercase `0x` hex prefix only.
 */

// ---------------------------------------------------------
// Concrete-state primitives
//
// The library primitives are state-polymorphic (`Parser<A,
// S>` for any `S`). A concrete grammar pins `S` once by
// assigning each leaf to the grammar's state type; the
// combinators then infer `S = LexState` from these leaves
// (an annotation, never a cast).
// ---------------------------------------------------------

const anyC: Parser<SoftStr, LexState> = anyChar;
const ws: Parser<SoftStr, LexState> = whitespace;
const dig: Parser<SoftStr, LexState> = digit;
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

/** Join a run of single-character matches into one string. */
const joinChars = (
  cs: ReadonlyArray<SoftStr>,
): SoftStr => cs.join("");

/** A char-run parser, projected to its matched substring. */
const textOf = (
  p: Parser<ReadonlyArray<SoftStr>, LexState>,
): Parser<SoftStr, LexState> =>
  pipe(p, map(joinChars));

/** An optional sub-parser, projected to `""` when absent. */
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
// Emission: turn matched text into a token AND advance the
// regex-vs-division context.
// ---------------------------------------------------------

/** Trivia emission — leaves `regexAllowed` untouched. */
const keepContext: Parser<true, LexState> =
  succeed(true);

/** Significant emission — records the next `regexAllowed`. */
const recordContext = (
  kind: TokTag,
  text: SoftStr,
): Parser<true, LexState> =>
  setUserState(
    (): LexState => ({
      regexAllowed: nextRegexAllowed(kind, text),
    }),
  );

/**
 * Emit one token of `kind` for `text`, updating the threaded
 * context when the token is `significant` (a value/keyword/
 * operator) and leaving it untouched for trivia.
 */
const emit =
  (kind: TokTag, significant: boolean) =>
  (
    text: SoftStr,
  ): Parser<ReadonlyArray<Tok>, LexState> =>
    right(
      significant
        ? recordContext(kind, text)
        : keepContext,
      succeed([tok(tokKind(kind), text)]),
    );

// ---------------------------------------------------------
// Whitespace, comments
// ---------------------------------------------------------

const wsToken: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  textOf(many1(ws)),
  andThen(emit("Plain", false)),
);

const lineComment: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  textOf(
    seq([lit("//"), textOf(many(noneOfC("\n")))]),
  ),
  andThen(emit("Comment", false)),
);

/** Emit a block comment, degrading an unterminated one to Plain. */
const emitBlock = (
  open: SoftStr,
  body: SoftStr,
  close: Option<SoftStr>,
): Parser<ReadonlyArray<Tok>, LexState> =>
  pipe(
    close,
    matchOption(
      (): Parser<ReadonlyArray<Tok>, LexState> =>
        emit("Plain", false)(open + body),
      (
        c: SoftStr,
      ): Parser<ReadonlyArray<Tok>, LexState> =>
        emit("Comment", false)(open + body + c),
    ),
  );

const blockComment: Parser<
  ReadonlyArray<Tok>,
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

/** A backslash escape, kept verbatim (both chars). */
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

/** Emit a string, degrading an unterminated one to Plain. */
const emitString = (
  open: SoftStr,
  body: SoftStr,
  close: Option<SoftStr>,
): Parser<ReadonlyArray<Tok>, LexState> =>
  pipe(
    close,
    matchOption(
      (): Parser<ReadonlyArray<Tok>, LexState> =>
        emit("Plain", false)(open + body),
      (
        c: SoftStr,
      ): Parser<ReadonlyArray<Tok>, LexState> =>
        emit("String", true)(open + body + c),
    ),
  );

const stringToken = (
  quote: SoftStr,
): Parser<ReadonlyArray<Tok>, LexState> =>
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
// Numbers
// ---------------------------------------------------------

const hexDigit: Parser<SoftStr, LexState> = sat(
  "hex digit",
  (c: SoftStr): boolean =>
    (c >= "0" && c <= "9") ||
    (c >= "a" && c <= "f") ||
    (c >= "A" && c <= "F"),
);

const hexNumber: Parser<SoftStr, LexState> =
  textOf(
    seq([lit("0x"), textOf(many1(hexDigit))]),
  );

const fraction: Parser<SoftStr, LexState> =
  textOf(seq([chr("."), textOf(many1(dig))]));

const decimalNumber: Parser<SoftStr, LexState> =
  textOf(
    seq([
      textOf(many1(dig)),
      optText(fraction),
      optText(chr("n")),
    ]),
  );

const numberToken: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  or(hexNumber, decimalNumber),
  andThen(emit("Number", true)),
);

// ---------------------------------------------------------
// Identifiers and keywords
// ---------------------------------------------------------

/** A representative TypeScript keyword set for the demo. */
const KEYWORDS: ReadonlyArray<SoftStr> = [
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "class",
  "extends",
  "new",
  "this",
  "super",
  "import",
  "export",
  "from",
  "as",
  "type",
  "interface",
  "enum",
  "namespace",
  "public",
  "private",
  "protected",
  "readonly",
  "static",
  "async",
  "await",
  "yield",
  "typeof",
  "instanceof",
  "in",
  "of",
  "void",
  "delete",
  "null",
  "undefined",
  "true",
  "false",
  "default",
  "try",
  "catch",
  "finally",
  "throw",
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
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  identText,
  andThen((word: SoftStr) =>
    emit(
      isKeyword(word) ? "Keyword" : "Identifier",
      true,
    )(word),
  ),
);

// ---------------------------------------------------------
// Regex vs. division (context-sensitive on the user-state)
// ---------------------------------------------------------

const regexBodyChar: Parser<SoftStr, LexState> =
  or(
    escaped,
    sat(
      "regex char",
      (c: SoftStr): boolean =>
        c !== "/" && c !== "\n",
    ),
  );

const regexText: Parser<SoftStr, LexState> =
  textOf(
    seq([
      chr("/"),
      textOf(many1(regexBodyChar)),
      chr("/"),
      textOf(many(let_)),
    ]),
  );

const regexToken: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(regexText, andThen(emit("Regex", true)));

const divisionToken: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  or(lit("/="), chr("/")),
  andThen(emit("Punctuation", true)),
);

/**
 * At a `/`, consult the threaded context: in operator
 * position try a regex literal (falling back to division if
 * it does not close on the line); after a value, always
 * division.
 */
const slashToken: Parser<
  ReadonlyArray<Tok>,
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
  "===",
  "!==",
  "...",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "**",
  "?.",
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
  ReadonlyArray<Tok>,
  LexState
> = pipe(
  or(opToken, singlePunct),
  andThen(emit("Punctuation", true)),
);

// The last resort: consume any single character as Plain, so
// `oneToken` is TOTAL on non-empty input and the lexer never
// throws or rejects (irregular chars degrade to Plain).
const fallbackToken: Parser<
  ReadonlyArray<Tok>,
  LexState
> = pipe(anyC, andThen(emit("Plain", false)));

// ---------------------------------------------------------
// The template seam
// ---------------------------------------------------------

/** Char at `i`, or `""` past the end (indexed reads wrapped). */
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

/** True when `produced` is exactly the one-char punct `ch`. */
const isBraceTok = (
  produced: ReadonlyArray<Tok>,
  ch: SoftStr,
): boolean =>
  produced.length === 1 &&
  pipe(
    fromNullable(produced[0]),
    matchOption(
      (): boolean => false,
      (t: Tok): boolean => t.content.text === ch,
    ),
  );

/**
 * Lex a template literal, recursively re-entering the token
 * grammar for each `${…}` interpolation with brace-depth
 * tracking. This is a documented imperative seam: a template
 * rescan is a stateful cursor with no pure-expression form —
 * a local cursor + push accumulators, confined here. The
 * interpolation body is still lexed by the combinator
 * {@link oneToken}, so a nested template inside `${…}`
 * recurses back through here for free. An unterminated
 * template degrades its trailing chunk to `Plain` (never a
 * throw).
 */
const lexTemplate: Parser<
  ReadonlyArray<Tok>,
  LexState
> = (state) => {
  const source = state.source;
  const n = source.length;
  // Guard: only a backtick opens a template. Without this the
  // seam would "succeed" on any input (even EOF), advancing
  // position forever and starving `many`.
  if (charAt(source, state.position) !== "`") {
    return err(
      parseError(
        "expected template literal",
        state.position,
      ),
    );
  }
  const tokens: Array<Tok> = [];
  let pos = state.position;
  let chunk = charAt(source, pos); // opening backtick
  pos = pos + 1;
  for (;;) {
    if (pos >= n) {
      // Unterminated at EOF: degrade the chunk to Plain.
      tokens.push(tok(tokKind("Plain"), chunk));
      return ok(
        parsed(
          tokens,
          mkState(source, pos, state.userState),
        ),
      );
    }
    const c = charAt(source, pos);
    if (c === "\\") {
      // Escape: keep the backslash and the next char verbatim.
      chunk = chunk + c + charAt(source, pos + 1);
      pos = pos + 2;
      continue;
    }
    if (c === "`") {
      chunk = chunk + c;
      pos = pos + 1;
      tokens.push(
        tok(tokKind("Template"), chunk),
      );
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
      tokens.push(
        tok(tokKind("Template"), chunk),
      );
      // Lex the interpolation expression until its matching }.
      let depth = 1;
      let cur = mkState(source, pos, {
        regexAllowed: true,
      });
      for (;;) {
        if (cur.position >= n) {
          // Unterminated interpolation at EOF.
          return ok(parsed(tokens, cur));
        }
        if (
          charAt(source, cur.position) === "}" &&
          depth === 1
        ) {
          // The closing brace: resume the template chunk.
          chunk = "}";
          pos = cur.position + 1;
          break;
        }
        const step = oneToken(cur);
        if (!isOk(step)) {
          // oneToken is total on non-empty input; defensive.
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
 * Lex one token (one or more {@link Tok}s — templates emit
 * several). Ordered choice, comments before `slashToken` so
 * `//` and `/*` win over regex/division; the `fallbackToken`
 * makes the choice total on any non-empty input.
 */
const oneToken: Parser<
  ReadonlyArray<Tok>,
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

/** Flatten the per-step token groups into one stream. */
const flatten = (
  groups: ReadonlyArray<ReadonlyArray<Tok>>,
): ReadonlyArray<Tok> =>
  groups.flatMap((g: ReadonlyArray<Tok>) => g);

/**
 * Lex TypeScript `source` into a classified {@link Tok}
 * stream. Total: `oneToken` consumes every character (down
 * to a `Plain` fallback), so the parse always succeeds — the
 * `matchResult` failure arm is a defensive net that yields
 * the whole input as one `Plain` token, never a throw.
 */
export const tsLex = (
  source: SoftStr,
): ReadonlyArray<Tok> =>
  pipe(
    run(
      pipe(many(oneToken), map(flatten)),
      source,
      initLexState,
    ),
    matchResult(
      (): ReadonlyArray<Tok> => [
        tok(tokKind("Plain"), source),
      ],
      (toks: ReadonlyArray<Tok>) => toks,
    ),
  );
