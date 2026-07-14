import {
  SoftStr,
  Option,
  Result,
  InvalidError,
  invalidError,
  some,
  none,
  ok,
  err,
  pipe,
  fromNullable,
  getOr,
  matchOption,
  mapResult,
  chainResult,
} from "plgg";
import {
  type Parser,
  run,
  char,
  literal,
  satisfy,
  oneOf,
  noneOf,
  letter,
  alphaNum,
  digit,
  many,
  many1,
  map,
  or,
  right,
  left,
  andThen,
  optional,
  lookahead,
  notFollowedBy,
  succeed,
  fail,
  eof,
} from "plgg-parser";
import {
  Block,
  HeadingLevel,
  ListItem,
  TableAlign,
  TableRow,
  asHeadingLevel,
  heading,
  para,
  codeFence,
  list,
  quote,
  table,
  callout,
  thematicBreak,
  htmlBlock,
} from "plgg-md/Block/model/Block";

// ---------------------------------------------------------------------------
// Character grammar — the bounded plggpress subset
// (`spike-decisions.md` §7). Everything outside it
// falls through to a paragraph (raw HTML included).
//
// The grammar is a PEG over the RAW SOURCE, not over a
// line array: line ends are explicit ({@link eol}), so a
// construct that needs the next line simply keeps parsing
// (a table's separator row) and one that must not cross a
// line end says so ({@link dot}).
// ---------------------------------------------------------------------------

const join = (
  cs: ReadonlyArray<SoftStr>,
): SoftStr => cs.join("");

/**
 * End of line: a newline, or the end of the source. The
 * original grammar tested its regexes against the members
 * of `source.split("\n")`, so an anchoring `$` meant
 * exactly this position — and nothing else, since `$` is
 * unaffected by the absence of the `m` flag here.
 */
const eol: Parser<true, null> = or<true, null>(
  map<SoftStr, true>((): true => true)(
    char("\n"),
  ),
  eof,
);

/**
 * The regex `.`: any character that is NOT a line
 * terminator. `\r` is one — so the original's `(.*)$`
 * groups could not cross a CR, and a CRLF line matched no
 * construct at all and fell through to a paragraph. That
 * is reproduced by excluding the same four characters.
 */
const dot: Parser<SoftStr, null> = noneOf(
  "\n\r\u2028\u2029",
);

/** `(.*)$` — a trailing capture that must reach the line end. */
const dotStarLine: Parser<SoftStr, null> = left(
  map(join)(many<SoftStr, null>(dot)),
  eol,
);

/**
 * One whole line VERBATIM — the original's `lines[i]`,
 * terminator consumed. Distinct from {@link dotStarLine}:
 * a raw line may hold a CR, which the regex groups could
 * not capture but the line array happily carried.
 */
const rawLine: Parser<SoftStr, null> = left(
  map(join)(many<SoftStr, null>(noneOf("\n"))),
  eol,
);

/** `[ \t]*` — the intra-line spacing every construct allows. */
const hspaces: Parser<
  ReadonlyArray<SoftStr>,
  null
> = many<SoftStr, null>(oneOf(" \t"));

/**
 * ` {0,3}` — the leading-space allowance of the quote,
 * thematic-break and html-block openers. Greedy is exact:
 * a fourth space can never be matched by what follows, so
 * the regex's backtracking could not rescue it either.
 */
const upTo3Spaces: Parser<true, null> = pipe(
  many<SoftStr, null>(char(" ")),
  andThen<ReadonlyArray<SoftStr>, true, null>(
    (sp: ReadonlyArray<SoftStr>) =>
      sp.length <= 3
        ? succeed<true>(true)
        : fail("at most 3 leading spaces"),
  ),
);

/** A line that `trim()`s to nothing — the block separator. */
const blankLine: Parser<SoftStr, null> = pipe(
  rawLine,
  andThen<SoftStr, SoftStr, null>(
    (line: SoftStr) =>
      line.trim() === ""
        ? succeed<SoftStr>(line)
        : fail("a blank line"),
  ),
);

/** Its complement: the paragraph/html-block body line. */
const nonBlankLine: Parser<SoftStr, null> = pipe(
  rawLine,
  andThen<SoftStr, SoftStr, null>(
    (line: SoftStr) =>
      line.trim() !== ""
        ? succeed<SoftStr>(line)
        : fail("a non-blank line"),
  ),
);

/**
 * A construct's outcome. Errors are **values**, not parse
 * failures: an unterminated fence, a mismatched container
 * and a malformed table are committed constructs that
 * FAIL, and a failing PEG branch would instead backtrack
 * and let the line become a paragraph. Carrying the error
 * as a value keeps the original's "the first error stops
 * the scan" contract.
 */
type BlockResult = Result<Block, InvalidError>;

// ---------------------------------------------------------------------------
// Fenced code
// ---------------------------------------------------------------------------

/** An opening fence: its marker run and its info string. */
type FenceOpen = Readonly<{
  marker: SoftStr;
  lang: SoftStr;
}>;

/** ` ```+ ` / `~~~+` — a MAXIMAL run of 3 or more. */
const fenceRun = (
  ch: SoftStr,
): Parser<SoftStr, null> =>
  pipe(
    map(join)(many1<SoftStr, null>(char(ch))),
    andThen<SoftStr, SoftStr, null>(
      (marker: SoftStr) =>
        marker.length >= 3
          ? succeed<SoftStr>(marker)
          : fail("a 3+ character fence run"),
    ),
  );

const fenceMarker: Parser<SoftStr, null> = or<
  SoftStr,
  null
>(fenceRun("`"), fenceRun("~"));

/**
 * The info string's `[^\s`~]*`, where `\s` is
 * **JavaScript's** Unicode whitespace — strictly wider
 * than plgg-parser's `whitespace`, so an exact predicate
 * is required to keep exotic info strings identical.
 */
const infoChar: Parser<SoftStr, null> = satisfy(
  "info string character",
  (ch: SoftStr): boolean =>
    ch !== "`" && ch !== "~" && !/\s/.test(ch),
);

const fenceOpenLine: Parser<FenceOpen, null> =
  pipe(
    fenceMarker,
    andThen<SoftStr, FenceOpen, null>(
      (marker: SoftStr) =>
        map<SoftStr, FenceOpen>(
          (lang: SoftStr): FenceOpen => ({
            marker,
            lang,
          }),
        )(
          left(
            right(
              hspaces,
              map(join)(
                many<SoftStr, null>(infoChar),
              ),
            ),
            right(hspaces, eol),
          ),
        ),
    ),
  );

/**
 * A bare close fence sharing the opener's CHARACTER —
 * ` ``` ` is not closed by `~~~`, but IS closed by a run
 * of a different length.
 */
const fenceCloseLine = (
  marker: SoftStr,
): Parser<SoftStr, null> =>
  left(
    pipe(
      fenceMarker,
      andThen<SoftStr, SoftStr, null>(
        (close: SoftStr) =>
          close.charAt(0) === marker.charAt(0)
            ? succeed<SoftStr>(close)
            : fail("a matching close fence"),
      ),
    ),
    right(hspaces, eol),
  );

/**
 * A fenced code block: the info string verbatim (`None`
 * when unlabeled) and the body up to a same-character
 * close. An unterminated fence is an error VALUE — the
 * body scan has then run to the end of the source, which
 * is exactly where the original's failed scan stopped.
 */
const fenceBlock: Parser<BlockResult, null> =
  pipe(
    fenceOpenLine,
    andThen<FenceOpen, BlockResult, null>(
      (open: FenceOpen) =>
        pipe(
          many<SoftStr, null>(
            right(
              notFollowedBy(
                fenceCloseLine(open.marker),
              ),
              rawLine,
            ),
          ),
          andThen<
            ReadonlyArray<SoftStr>,
            BlockResult,
            null
          >((body: ReadonlyArray<SoftStr>) =>
            or<BlockResult, null>(
              map<SoftStr, BlockResult>(
                (): BlockResult =>
                  ok(
                    codeFence(
                      open.lang === ""
                        ? none()
                        : some<SoftStr>(
                            open.lang,
                          ),
                      body.join("\n"),
                    ),
                  ),
              )(fenceCloseLine(open.marker)),
              succeed<BlockResult>(
                err(
                  invalidError({
                    message: `Unterminated code fence opened with '${open.marker}'`,
                  }),
                ),
              ),
            ),
          ),
        ),
    ),
  );

// ---------------------------------------------------------------------------
// `:::`-container directive
// ---------------------------------------------------------------------------

/** An opening directive: `:{3,} kind [title]`. */
type ContainerOpen = Readonly<{
  colons: number;
  kind: SoftStr;
  title: SoftStr;
}>;

/** `:{3,}` — a MAXIMAL run, reported by its length. */
const colonRun: Parser<number, null> = pipe(
  map(join)(many1<SoftStr, null>(char(":"))),
  andThen<SoftStr, number, null>(
    (colons: SoftStr) =>
      colons.length >= 3
        ? succeed<number>(colons.length)
        : fail("a 3+ colon run"),
  ),
);

/** `[A-Za-z][\w-]*` — the directive's kind. */
const kindName: Parser<SoftStr, null> = pipe(
  letter,
  andThen<SoftStr, SoftStr, null>(
    (first: SoftStr) =>
      map<ReadonlyArray<SoftStr>, SoftStr>(
        (rest: ReadonlyArray<SoftStr>): SoftStr =>
          `${first}${join(rest)}`,
      )(
        many<SoftStr, null>(
          or<SoftStr, null>(
            alphaNum,
            oneOf("_-"),
          ),
        ),
      ),
  ),
);

const containerOpenLine: Parser<
  ContainerOpen,
  null
> = pipe(
  colonRun,
  andThen<number, ContainerOpen, null>(
    (colons: number) =>
      pipe(
        right(hspaces, kindName),
        andThen<SoftStr, ContainerOpen, null>(
          (kind: SoftStr) =>
            map<SoftStr, ContainerOpen>(
              (
                title: SoftStr,
              ): ContainerOpen => ({
                colons,
                kind,
                title: title.trim(),
              }),
            )(right(hspaces, dotStarLine)),
        ),
      ),
  ),
);

/** A bare `:{3,}` close, reported by its colon count. */
const containerCloseLine: Parser<number, null> =
  left(colonRun, right(hspaces, eol));

/** How the container's colon-count scan ended. */
type Scan =
  | Readonly<{
      tag: "closed";
      body: ReadonlyArray<SoftStr>;
    }>
  | Readonly<{ tag: "mismatch" }>
  | Readonly<{ tag: "unterminated" }>;

/**
 * One scanned line, classified but kept VERBATIM: the
 * body is re-parsed as rebuilt source, so a nested opener
 * or closer rides along inside it untouched.
 */
type ScanLine =
  | Readonly<{
      tag: "open";
      colons: number;
      raw: SoftStr;
    }>
  | Readonly<{
      tag: "close";
      colons: number;
      raw: SoftStr;
    }>
  | Readonly<{ tag: "other"; raw: SoftStr }>;

const scanLine: Parser<ScanLine, null> = or<
  ScanLine,
  null
>(
  pipe(
    lookahead(containerOpenLine),
    andThen<ContainerOpen, ScanLine, null>(
      (open: ContainerOpen) =>
        map<SoftStr, ScanLine>(
          (raw: SoftStr): ScanLine => ({
            tag: "open",
            colons: open.colons,
            raw,
          }),
        )(rawLine),
    ),
  ),
  pipe(
    lookahead(containerCloseLine),
    andThen<number, ScanLine, null>(
      (colons: number) =>
        map<SoftStr, ScanLine>(
          (raw: SoftStr): ScanLine => ({
            tag: "close",
            colons,
            raw,
          }),
        )(rawLine),
    ),
  ),
  map<SoftStr, ScanLine>(
    (raw: SoftStr): ScanLine => ({
      tag: "other",
      raw,
    }),
  )(rawLine),
);

/**
 * The colon-count STACK: any opener pushes, a close pops
 * only on an EXACT count match, and a wrong-length close
 * is a hard mismatch — distinct from never closing at
 * all. Note what is NOT here: the scan is flat, so a
 * `:::` inside a fenced code block still counts.
 */
const containerScan = (
  stack: ReadonlyArray<number>,
  body: ReadonlyArray<SoftStr>,
): Parser<Scan, null> =>
  or<Scan, null>(
    map<true, Scan>((): Scan => ({
      tag: "unterminated",
    }))(eof),
    pipe(
      scanLine,
      andThen<ScanLine, Scan, null>(
        (line: ScanLine) =>
          line.tag === "open"
            ? containerScan(
                [...stack, line.colons],
                [...body, line.raw],
              )
            : line.tag === "close"
              ? containerClose(
                  stack,
                  body,
                  line.colons,
                  line.raw,
                )
              : containerScan(stack, [
                  ...body,
                  line.raw,
                ]),
      ),
    ),
  );

/** The close-line step of {@link containerScan}. */
const containerClose = (
  stack: ReadonlyArray<number>,
  body: ReadonlyArray<SoftStr>,
  colons: number,
  raw: SoftStr,
): Parser<Scan, null> =>
  pipe(
    fromNullable(stack[stack.length - 1]),
    getOr(0),
  ) !== colons
    ? succeed<Scan>({ tag: "mismatch" })
    : stack.length === 1
      ? succeed<Scan>({ tag: "closed", body })
      : containerScan(stack.slice(0, -1), [
          ...body,
          raw,
        ]);

/**
 * A `:::`-container, accepting 3+ MATCHING colons so
 * `::::` nests around an inner `:::`. The body is
 * re-parsed as REBUILT SOURCE (not as a sub-parse of this
 * state), so nested containers become nested
 * {@link callout}s and a child's error propagates.
 */
const containerBlock = (
  rawHtml: boolean,
): Parser<BlockResult, null> =>
  pipe(
    containerOpenLine,
    andThen<ContainerOpen, BlockResult, null>(
      (open: ContainerOpen) =>
        map<Scan, BlockResult>(
          (scan: Scan): BlockResult =>
            scan.tag === "mismatch"
              ? err(
                  invalidError({
                    message: `Mismatched container fence: a close does not match the opening ${open.colons}-colon run`,
                  }),
                )
              : scan.tag === "unterminated"
                ? err(
                    invalidError({
                      message: `Unterminated container '${open.kind}' opened with ${open.colons} colons`,
                    }),
                  )
                : pipe(
                    parseBlocks(
                      scan.body.join("\n"),
                      rawHtml,
                    ),
                    mapResult(
                      (
                        children: ReadonlyArray<Block>,
                      ): Block =>
                        callout(
                          open.kind,
                          open.title === ""
                            ? none()
                            : some<SoftStr>(
                                open.title,
                              ),
                          children,
                        ),
                    ),
                  ),
        )(containerScan([open.colons], [])),
    ),
  );

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

/** An ATX heading line: its depth and its text. */
type HeadingLine = Readonly<{
  level: number;
  text: SoftStr;
}>;

/** `#{1,6}` — a MAXIMAL run, since a 7th `#` can only fail. */
const hashRun: Parser<number, null> = pipe(
  map(join)(many1<SoftStr, null>(char("#"))),
  andThen<SoftStr, number, null>(
    (hashes: SoftStr) =>
      hashes.length <= 6
        ? succeed<number>(hashes.length)
        : fail("1 to 6 hashes"),
  ),
);

/** `[ \t]*#*[ \t]*$` — the optional closing-hash tail. */
const headingTail: Parser<true, null> = right(
  hspaces,
  right(
    many<SoftStr, null>(char("#")),
    right(hspaces, eol),
  ),
);

/**
 * `#…# text [#…]`. The text group is LAZY, and stops at
 * the FIRST position where the closing tail runs to the
 * line end: `# Hello ###` is `Hello` (the tail eats the
 * hashes) but `# Hello #x` is `Hello #x` (the tail cannot
 * reach the end, so the hash stays text).
 */
const headingLine: Parser<HeadingLine, null> =
  pipe(
    hashRun,
    andThen<number, HeadingLine, null>(
      (level: number) =>
        right(
          many1<SoftStr, null>(oneOf(" \t")),
          map<
            ReadonlyArray<SoftStr>,
            HeadingLine
          >(
            (
              cs: ReadonlyArray<SoftStr>,
            ): HeadingLine => ({
              level,
              text: join(cs),
            }),
          )(
            left(
              many<SoftStr, null>(
                right(
                  notFollowedBy(headingTail),
                  dot,
                ),
              ),
              headingTail,
            ),
          ),
        ),
    ),
  );

/** The heading block — {@link asHeadingLevel}'s error rides through. */
const headingBlock: Parser<BlockResult, null> =
  map<HeadingLine, BlockResult>(
    (head: HeadingLine): BlockResult =>
      pipe(
        asHeadingLevel(head.level),
        mapResult((level: HeadingLevel): Block =>
          heading(level, head.text),
        ),
      ),
  )(headingLine);

// ---------------------------------------------------------------------------
// Thematic break, quote
// ---------------------------------------------------------------------------

/** 3+ of `-`/`*`/`_`, spaces allowed, all the SAME character. */
const thematicBreakLine: Parser<true, null> =
  right(
    upTo3Spaces,
    pipe(
      oneOf("-*_"),
      andThen<SoftStr, true, null>(
        (ch: SoftStr) =>
          pipe(
            many<SoftStr, null>(
              right(hspaces, char(ch)),
            ),
            andThen<
              ReadonlyArray<SoftStr>,
              true,
              null
            >((rest: ReadonlyArray<SoftStr>) =>
              rest.length >= 2
                ? right(hspaces, eol)
                : fail("2 more break characters"),
            ),
          ),
      ),
    ),
  );

/** One `>` line, stripped of its marker and ONE space. */
const quoteLine: Parser<SoftStr, null> = right(
  upTo3Spaces,
  right(
    char(">"),
    right(optional(oneOf(" \t")), dotStarLine),
  ),
);

/**
 * A run of `>` lines, its de-quoted body re-parsed as
 * REBUILT SOURCE — the same "extract text, parse it
 * again" shape the container uses.
 */
const quoteBlock = (
  rawHtml: boolean,
): Parser<BlockResult, null> =>
  map<ReadonlyArray<SoftStr>, BlockResult>(
    (body: ReadonlyArray<SoftStr>): BlockResult =>
      pipe(
        parseBlocks(body.join("\n"), rawHtml),
        mapResult(
          (
            children: ReadonlyArray<Block>,
          ): Block => quote(children),
        ),
      ),
  )(many1<SoftStr, null>(quoteLine));

// ---------------------------------------------------------------------------
// Pipe table
// ---------------------------------------------------------------------------

/** `:?-{1,}:?` — one cell of the alignment row. */
const dashCell: Parser<true, null> = right(
  optional(char(":")),
  right(
    many1<SoftStr, null>(char("-")),
    map<Option<SoftStr>, true>((): true => true)(
      optional(char(":")),
    ),
  ),
);

/** `\|[ \t]*:?-{1,}:?[ \t]*` — a subsequent alignment cell. */
const sepMoreCell: Parser<true, null> = right(
  char("|"),
  right(hspaces, left(dashCell, hspaces)),
);

/** The whole header/body separator row. */
const tableSepLine: Parser<true, null> = right(
  hspaces,
  right(
    optional(char("|")),
    right(
      hspaces,
      right(
        dashCell,
        right(
          hspaces,
          right(
            many<true, null>(sepMoreCell),
            right(
              optional(char("|")),
              right(hspaces, eol),
            ),
          ),
        ),
      ),
    ),
  ),
);

/** A line holding a `|` — the table's header and body rows. */
const pipeLine: Parser<SoftStr, null> = pipe(
  rawLine,
  andThen<SoftStr, SoftStr, null>(
    (line: SoftStr) =>
      line.includes("|")
        ? succeed<SoftStr>(line)
        : fail("a table row"),
  ),
);

/** Splits a `| a | b |` row into trimmed cells. */
const splitRow = (line: SoftStr): TableRow =>
  pipe(
    line.trim(),
    (trimmed: SoftStr): SoftStr =>
      trimmed.startsWith("|")
        ? trimmed.slice(1)
        : trimmed,
    (stripped: SoftStr): SoftStr =>
      stripped.endsWith("|")
        ? stripped.slice(0, -1)
        : stripped,
  )
    .split("|")
    .map((cell: SoftStr): SoftStr => cell.trim());

/** Reads a separator cell's alignment colons. */
const parseAlign = (
  cell: SoftStr,
): TableAlign => {
  const c = cell.trim();
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  return left && right
    ? "center"
    : right
      ? "right"
      : left
        ? "left"
        : "default";
};

/** The body rows: every following line that merely holds a `|`. */
const tableRows = (
  header: TableRow,
  align: ReadonlyArray<TableAlign>,
): Parser<BlockResult, null> =>
  align.length !== header.length
    ? succeed<BlockResult>(
        err(
          invalidError({
            message: `Malformed table: ${align.length} alignment cells for ${header.length} header cells`,
          }),
        ),
      )
    : map<ReadonlyArray<TableRow>, BlockResult>(
        (
          rows: ReadonlyArray<TableRow>,
        ): BlockResult =>
          ok(table(header, align, rows)),
      )(
        many<TableRow, null>(
          map(splitRow)(pipeLine),
        ),
      );

/**
 * A pipe table: a `|`-bearing header, an alignment row,
 * then body rows. A separator whose column count
 * disagrees with the header is malformed — and the
 * construct is already committed by then, so that is an
 * error VALUE, not a fall back to a paragraph.
 */
const tableBlock: Parser<BlockResult, null> =
  pipe(
    pipeLine,
    andThen<SoftStr, BlockResult, null>(
      (header: SoftStr) =>
        pipe(
          right(lookahead(tableSepLine), rawLine),
          andThen<SoftStr, BlockResult, null>(
            (sep: SoftStr) =>
              tableRows(
                splitRow(header),
                splitRow(sep).map(parseAlign),
              ),
          ),
        ),
    ),
  );

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** A matched list-item marker: its indent, ordering, and text. */
type ListMark = Readonly<{
  indent: number;
  ordered: boolean;
  text: SoftStr;
}>;

/** One level's harvest. */
type Level = Readonly<{
  items: ReadonlyArray<ListItem>;
  ordered: boolean;
}>;

const ulLine: Parser<ListMark, null> = pipe(
  hspaces,
  andThen<ReadonlyArray<SoftStr>, ListMark, null>(
    (indent: ReadonlyArray<SoftStr>) =>
      right(
        oneOf("-*+"),
        right(
          many1<SoftStr, null>(oneOf(" \t")),
          map<SoftStr, ListMark>(
            (text: SoftStr): ListMark => ({
              indent: indent.length,
              ordered: false,
              text,
            }),
          )(dotStarLine),
        ),
      ),
  ),
);

const olLine: Parser<ListMark, null> = pipe(
  hspaces,
  andThen<ReadonlyArray<SoftStr>, ListMark, null>(
    (indent: ReadonlyArray<SoftStr>) =>
      right(
        many1<SoftStr, null>(digit),
        right(
          oneOf(".)"),
          right(
            many1<SoftStr, null>(oneOf(" \t")),
            map<SoftStr, ListMark>(
              (text: SoftStr): ListMark => ({
                indent: indent.length,
                ordered: true,
                text,
              }),
            )(dotStarLine),
          ),
        ),
      ),
  ),
);

const listMarkLine: Parser<ListMark, null> = or<
  ListMark,
  null
>(ulLine, olLine);

/** `[ \t]*` measured — the original's `indentOf`. */
const indentWidth: Parser<number, null> = map<
  ReadonlyArray<SoftStr>,
  number
>(
  (indent: ReadonlyArray<SoftStr>): number =>
    indent.length,
)(hspaces);

/**
 * A marker-less, non-blank, deeper-indented line: it
 * wraps the PREVIOUS item's text. The whole raw line is
 * rebuilt because the original tested and trimmed the
 * line, not the post-indent remainder.
 */
const continuationLine = (
  baseIndent: number,
): Parser<SoftStr, null> =>
  pipe(
    hspaces,
    andThen<
      ReadonlyArray<SoftStr>,
      SoftStr,
      null
    >((indent: ReadonlyArray<SoftStr>) =>
      pipe(
        rawLine,
        andThen<SoftStr, SoftStr, null>(
          (rest: SoftStr) =>
            pipe(
              `${join(indent)}${rest}`,
              (line: SoftStr) =>
                line.trim() !== "" &&
                indent.length > baseIndent
                  ? succeed<SoftStr>(line)
                  : fail("a list continuation"),
            ),
        ),
      ),
    ),
  );

/**
 * One list level. `ordered` is decided by the FIRST item
 * at the level and never flips; a shallower marker, a
 * marker-less unindented line and the end of the source
 * all close the level, which is why the final alternative
 * simply succeeds with what has been gathered.
 */
const listLevel = (
  baseIndent: number,
  items: ReadonlyArray<ListItem>,
  ordered: boolean,
  first: boolean,
): Parser<Level, null> =>
  or<Level, null>(
    pipe(
      lookahead(listMarkLine),
      andThen<ListMark, Level, null>(
        (mark: ListMark) =>
          listMarkStep(
            baseIndent,
            items,
            ordered,
            first,
            mark,
          ),
      ),
    ),
    pipe(
      right(
        notFollowedBy(listMarkLine),
        continuationLine(baseIndent),
      ),
      andThen<SoftStr, Level, null>(
        (line: SoftStr) =>
          listContinue(
            baseIndent,
            items,
            ordered,
            first,
            line,
          ),
      ),
    ),
    succeed<Level>({ items, ordered }),
  );

/**
 * A marker at this level, deeper, or shallower. A deeper
 * marker's list becomes a CHILD of the item above it (not
 * a sibling); a shallower one ends the level — expressed
 * as a branch failure, which the marker-less alternative
 * then also rejects, so the level simply closes.
 */
const listMarkStep = (
  baseIndent: number,
  items: ReadonlyArray<ListItem>,
  ordered: boolean,
  first: boolean,
  mark: ListMark,
): Parser<Level, null> =>
  mark.indent < baseIndent
    ? fail("a marker at this level")
    : mark.indent > baseIndent
      ? listNest(
          baseIndent,
          items,
          ordered,
          first,
          mark,
        )
      : right(
          listMarkLine,
          listLevel(
            baseIndent,
            [
              ...items,
              { text: mark.text, children: [] },
            ],
            first ? mark.ordered : ordered,
            false,
          ),
        );

const listNest = (
  baseIndent: number,
  items: ReadonlyArray<ListItem>,
  ordered: boolean,
  first: boolean,
  mark: ListMark,
): Parser<Level, null> =>
  pipe(
    fromNullable(items[items.length - 1]),
    matchOption(
      (): Parser<Level, null> =>
        fail("a preceding list item"),
      (last: ListItem): Parser<Level, null> =>
        pipe(
          listLevel(mark.indent, [], false, true),
          andThen<Level, Level, null>(
            (nested: Level) =>
              listLevel(
                baseIndent,
                [
                  ...items.slice(0, -1),
                  {
                    text: last.text,
                    children: [
                      ...last.children,
                      list(
                        nested.ordered,
                        nested.items,
                      ),
                    ],
                  },
                ],
                ordered,
                first,
              ),
          ),
        ),
    ),
  );

const listContinue = (
  baseIndent: number,
  items: ReadonlyArray<ListItem>,
  ordered: boolean,
  first: boolean,
  line: SoftStr,
): Parser<Level, null> =>
  pipe(
    fromNullable(items[items.length - 1]),
    matchOption(
      (): Parser<Level, null> =>
        fail("a preceding list item"),
      (last: ListItem): Parser<Level, null> =>
        listLevel(
          baseIndent,
          [
            ...items.slice(0, -1),
            {
              text: `${last.text} ${line.trim()}`,
              children: last.children,
            },
          ],
          ordered,
          first,
        ),
    ),
  );

/** A whole list, starting at its own indent. */
const listBlock: Parser<BlockResult, null> =
  right(
    lookahead(listMarkLine),
    pipe(
      lookahead(indentWidth),
      andThen<number, BlockResult, null>(
        (baseIndent: number) =>
          map<Level, BlockResult>(
            (level: Level): BlockResult =>
              ok(
                list(level.ordered, level.items),
              ),
          )(
            listLevel(
              baseIndent,
              [],
              false,
              true,
            ),
          ),
      ),
    ),
  );

// ---------------------------------------------------------------------------
// Raw HTML block
// ---------------------------------------------------------------------------

/** `[a-zA-Z][a-zA-Z0-9-]*` — an HTML tag name. */
const htmlTagName: Parser<SoftStr, null> = pipe(
  letter,
  andThen<SoftStr, SoftStr, null>(
    (first: SoftStr) =>
      map<ReadonlyArray<SoftStr>, SoftStr>(
        (rest: ReadonlyArray<SoftStr>): SoftStr =>
          `${first}${join(rest)}`,
      )(
        many<SoftStr, null>(
          or<SoftStr, null>(alphaNum, char("-")),
        ),
      ),
  ),
);

/**
 * A block-level HTML opener (only honored when `rawHtml`
 * is enabled): up to 3 leading spaces, then `<` or `</`,
 * a tag name, and a tag boundary (space/tab, `>`, `/`, or
 * end of line) or an HTML comment. Pragmatic cover of
 * CommonMark's HTML-block type 6 — enough for the
 * qmu.co.jp corpus (`<small class="updated">`, `<div>`
 * image blocks, `<iframe>` map embeds). A PREFIX test:
 * whatever follows the boundary is not this parser's
 * business.
 */
const htmlBlockOpen: Parser<true, null> = right(
  upTo3Spaces,
  or<true, null>(
    map<SoftStr, true>((): true => true)(
      literal("<!--"),
    ),
    right(
      char("<"),
      right(
        optional(char("/")),
        right(
          htmlTagName,
          or<true, null>(
            map<SoftStr, true>((): true => true)(
              oneOf(" \t>/"),
            ),
            eol,
          ),
        ),
      ),
    ),
  ),
);

/**
 * A block-level HTML run: the opener line and every
 * following non-blank line, verbatim, up to a blank line
 * or the end of the source (CommonMark's
 * blank-line-terminated HTML block).
 */
const htmlBlockRun: Parser<BlockResult, null> =
  right(
    lookahead(htmlBlockOpen),
    map<ReadonlyArray<SoftStr>, BlockResult>(
      (
        lines: ReadonlyArray<SoftStr>,
      ): BlockResult =>
        ok(htmlBlock(lines.join("\n"))),
    )(many1<SoftStr, null>(nonBlankLine)),
  );

// ---------------------------------------------------------------------------
// Paragraph — the fallthrough
// ---------------------------------------------------------------------------

/**
 * Whether a non-paragraph block starts here. Mirrors the
 * top-level branch set, and is the paragraph's terminator.
 */
const startsBlock = (
  rawHtml: boolean,
): Parser<true, null> =>
  or<true, null>(
    map<FenceOpen, true>((): true => true)(
      fenceOpenLine,
    ),
    map<ContainerOpen, true>((): true => true)(
      containerOpenLine,
    ),
    map<HeadingLine, true>((): true => true)(
      headingLine,
    ),
    thematicBreakLine,
    map<SoftStr, true>((): true => true)(
      quoteLine,
    ),
    map<ListMark, true>((): true => true)(
      listMarkLine,
    ),
    rawHtml
      ? htmlBlockOpen
      : fail("raw html disabled"),
    right(pipeLine, tableSepLine),
  );

/**
 * Consecutive lines up to a blank line or the start of
 * another block. The FIRST line is taken unconditionally
 * — that asymmetry is what lets an out-of-subset line
 * open a paragraph even when it would otherwise look like
 * a block opener.
 */
const paragraphBlock = (
  rawHtml: boolean,
): Parser<BlockResult, null> =>
  pipe(
    nonBlankLine,
    andThen<SoftStr, BlockResult, null>(
      (first: SoftStr) =>
        map<ReadonlyArray<SoftStr>, BlockResult>(
          (
            rest: ReadonlyArray<SoftStr>,
          ): BlockResult =>
            ok(para([first, ...rest].join("\n"))),
        )(
          many<SoftStr, null>(
            right(
              notFollowedBy(startsBlock(rawHtml)),
              nonBlankLine,
            ),
          ),
        ),
    ),
  );

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/** One construct's span: a blank line yields no block. */
const single = (
  parser: Parser<BlockResult, null>,
): Parser<ReadonlyArray<BlockResult>, null> =>
  map<BlockResult, ReadonlyArray<BlockResult>>(
    (
      block: BlockResult,
    ): ReadonlyArray<BlockResult> => [block],
  )(parser);

/**
 * The branch order IS the grammar and is reproduced
 * exactly: blank, fence, container, heading, thematic
 * break, quote, table (whose own separator row is the
 * look-ahead the original did over line `i+1`), html
 * block, list, and finally the paragraph that takes
 * anything left.
 */
const blockSpan = (
  rawHtml: boolean,
): Parser<ReadonlyArray<BlockResult>, null> =>
  or<ReadonlyArray<BlockResult>, null>(
    map<SoftStr, ReadonlyArray<BlockResult>>(
      (): ReadonlyArray<BlockResult> => [],
    )(blankLine),
    single(fenceBlock),
    single(containerBlock(rawHtml)),
    single(headingBlock),
    single(
      map<true, BlockResult>((): BlockResult =>
        ok(thematicBreak()),
      )(thematicBreakLine),
    ),
    single(quoteBlock(rawHtml)),
    single(tableBlock),
    single(
      rawHtml
        ? htmlBlockRun
        : fail("raw html disabled"),
    ),
    single(listBlock),
    single(paragraphBlock(rawHtml)),
  );

/**
 * Every construct in the source. Total by construction:
 * a line is blank or it is a paragraph, so the only way
 * out of the loop is the end of the source — which the
 * trailing `eof` re-asserts, turning any hole in that
 * reasoning into a failure instead of a silent truncation.
 */
const document = (
  rawHtml: boolean,
): Parser<
  ReadonlyArray<ReadonlyArray<BlockResult>>,
  null
> =>
  left(
    many<ReadonlyArray<BlockResult>, null>(
      blockSpan(rawHtml),
    ),
    eof,
  );

/**
 * Collects the scanned constructs, the FIRST error
 * winning and stopping the scan — `chainResult`
 * short-circuits exactly where the original's loop broke.
 */
const collect = (
  spans: ReadonlyArray<
    ReadonlyArray<BlockResult>
  >,
): Result<ReadonlyArray<Block>, InvalidError> =>
  spans
    .flat()
    .reduce<
      Result<ReadonlyArray<Block>, InvalidError>
    >(
      (acc, block) =>
        pipe(
          acc,
          chainResult(
            (blocks: ReadonlyArray<Block>) =>
              pipe(
                block,
                mapResult(
                  (
                    b: Block,
                  ): ReadonlyArray<Block> => [
                    ...blocks,
                    b,
                  ],
                ),
              ),
          ),
        ),
      ok([]),
    );

/**
 * Parses a Markdown body into a flat {@link Block}
 * sequence over the plggpress subset. Inline markup is
 * NOT parsed here (that is the render step). With `rawHtml`
 * off (the default) any out-of-subset line — raw HTML
 * included — rides along as {@link para} text and is
 * HTML-escaped at render; with `rawHtml` on, a block-level
 * HTML opener starts an {@link htmlBlock} rendered
 * verbatim. Failures — an unterminated fence, a
 * colon-count-mismatched container, a malformed pipe
 * table — return an {@link InvalidError}, never a throw.
 *
 * A plgg-parser grammar: PEG ordered choice supplies the
 * branch precedence the original encoded in its scan
 * order, and the constructs that must not backtrack carry
 * their failure as an error VALUE ({@link BlockResult}).
 */
export const parseBlocks = (
  source: SoftStr,
  rawHtml: boolean = false,
): Result<ReadonlyArray<Block>, InvalidError> =>
  pipe(
    run(document(rawHtml), source, null),
    chainResult(collect),
  );
