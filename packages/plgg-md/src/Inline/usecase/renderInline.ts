import {
  SoftStr,
  match,
  pipe,
  matchResult,
} from "plgg";
import {
  type Parser,
  run,
  char,
  literal,
  satisfy,
  anyChar,
  noneOf,
  oneOf,
  letter,
  alphaNum,
  many,
  many1,
  map,
  or,
  right,
  left,
  andThen,
  succeed,
  fail,
  notFollowedBy,
} from "plgg-parser";
import {
  Inline,
  inlineText,
  inlineCode,
  emph,
  strong,
  link,
  image,
  lineBreak,
  htmlSpan,
  text$,
  code$,
  emph$,
  strong$,
  link$,
  image$,
  lineBreak$,
  htmlSpan$,
} from "plgg-md/Inline/model/Inline";

const join = (
  cs: ReadonlyArray<SoftStr>,
): SoftStr => cs.join("");

/**
 * One step of the inline scan: either a completed markup
 * node, or a single character that opened nothing.
 *
 * The distinction is load-bearing. A character that fails
 * every markup branch is NOT its own text node — it merges
 * with its neighbours into one literal run (`a*b` is a
 * single `Text("a*b")`), so the char pieces are folded into
 * a buffer afterwards rather than mapped straight to
 * {@link inlineText}.
 */
type Piece =
  | Readonly<{ kind: "node"; node: Inline }>
  | Readonly<{ kind: "char"; ch: SoftStr }>;

const nodePiece = (node: Inline): Piece => ({
  kind: "node",
  node,
});

const charPiece = (ch: SoftStr): Piece => ({
  kind: "char",
  ch,
});

/**
 * The link/image destination character class: the original
 * grammar's `[^)\s]`, where `\s` is **JavaScript's** Unicode
 * whitespace — strictly wider than plgg-parser's `whitespace`
 * (space/tab/CR/LF only), so an exact predicate is required
 * to keep exotic destinations parsing identically.
 */
const destChar: Parser<SoftStr, null> = satisfy(
  "destination character",
  (ch: SoftStr): boolean =>
    ch !== ")" && !/\s/.test(ch),
);

const dest: Parser<SoftStr, null> = map(join)(
  many<SoftStr, null>(destChar),
);

/** The `[…]` label body: anything up to the closing `]`. */
const label: Parser<SoftStr, null> = map(join)(
  many<SoftStr, null>(noneOf("]")),
);

/** `![alt](src)` — tried before `[text](href)`. */
const imageP: Parser<Inline, null> = pipe(
  right(literal("!["), label),
  andThen<SoftStr, Inline, null>((alt: SoftStr) =>
    map<SoftStr, Inline>((src: SoftStr): Inline =>
      image(src, alt),
    )(
      right(literal("]("), left(dest, char(")"))),
    ),
  ),
);

/** `[text](href)`; the label recurses under the same options. */
const linkP = (
  rawHtml: boolean,
): Parser<Inline, null> =>
  pipe(
    right(char("["), label),
    andThen<SoftStr, Inline, null>(
      (text: SoftStr) =>
        map<SoftStr, Inline>(
          (href: SoftStr): Inline =>
            link(
              href,
              renderInline(text, rawHtml),
            ),
        )(
          right(
            literal("]("),
            left(dest, char(")")),
          ),
        ),
    ),
  );

/** `[a-zA-Z][a-zA-Z0-9-]*` — an HTML tag name. */
const tagName: Parser<SoftStr, null> = pipe(
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
 * `<!-- … -->`, lazily terminated at the FIRST `-->`.
 * Rebuilt verbatim: an html token is emitted as source.
 */
const htmlComment: Parser<SoftStr, null> = map<
  ReadonlyArray<SoftStr>,
  SoftStr
>(
  (body: ReadonlyArray<SoftStr>): SoftStr =>
    `<!--${join(body)}-->`,
)(
  right(
    literal("<!--"),
    left(
      many<SoftStr, null>(
        right(
          notFollowedBy(literal("-->")),
          anyChar,
        ),
      ),
      literal("-->"),
    ),
  ),
);

/** `</name…>` with optional trailing spaces/tabs. */
const htmlCloseTag: Parser<SoftStr, null> = pipe(
  right(literal("</"), tagName),
  andThen<SoftStr, SoftStr, null>(
    (name: SoftStr) =>
      map<ReadonlyArray<SoftStr>, SoftStr>(
        (sp: ReadonlyArray<SoftStr>): SoftStr =>
          `</${name}${join(sp)}>`,
      )(
        left(
          many<SoftStr, null>(oneOf(" \t")),
          char(">"),
        ),
      ),
  ),
);

/**
 * The optional ` attrs` part of an open tag: a space/tab
 * then anything but `<`/`>`. Greedy here is equivalent to
 * the original's lazy `[^<>]*?` because `>` cannot occur
 * inside the class — both stop at the same `>`.
 */
const attrsPart: Parser<SoftStr, null> = or<
  SoftStr,
  null
>(
  pipe(
    oneOf(" \t"),
    andThen<SoftStr, SoftStr, null>(
      (ws: SoftStr) =>
        map<ReadonlyArray<SoftStr>, SoftStr>(
          (cs: ReadonlyArray<SoftStr>): SoftStr =>
            `${ws}${join(cs)}`,
        )(many<SoftStr, null>(noneOf("<>"))),
    ),
  ),
  succeed(""),
);

/** `<name attrs/>` or `<name>`. */
const htmlOpenTag: Parser<SoftStr, null> = pipe(
  right(char("<"), tagName),
  andThen<SoftStr, SoftStr, null>(
    (name: SoftStr) =>
      pipe(
        attrsPart,
        andThen<SoftStr, SoftStr, null>(
          (attrs: SoftStr) =>
            map<SoftStr, SoftStr>(
              (slash: SoftStr): SoftStr =>
                `<${name}${attrs}${slash}>`,
            )(
              left(
                or<SoftStr, null>(
                  char("/"),
                  succeed(""),
                ),
                char(">"),
              ),
            ),
        ),
      ),
  ),
);

/** Comment → close tag → open tag, the original's order. */
const htmlToken: Parser<Inline, null> = map<
  SoftStr,
  Inline
>((raw: SoftStr): Inline => htmlSpan(raw))(
  or<SoftStr, null>(
    htmlComment,
    or<SoftStr, null>(htmlCloseTag, htmlOpenTag),
  ),
);

/** A MAXIMAL run of backticks (`many1` is greedy). */
const tickRun: Parser<SoftStr, null> = map(join)(
  many1<SoftStr, null>(char("`")),
);

/**
 * CommonMark inline-code trimming: a single leading and
 * trailing space is dropped when the span both opens and
 * closes with a space and is not all whitespace (so
 * `` ` code ` `` → `code`, but `` `  ` `` is preserved).
 */
const trimCode = (code: SoftStr): SoftStr =>
  code.length > 2 &&
  code.startsWith(" ") &&
  code.endsWith(" ") &&
  code.trim() !== ""
    ? code.slice(1, -1)
    : code;

/**
 * An n-backtick span closed by a run of EXACTLY n
 * backticks. Runs of any other length are consumed WHOLE
 * as body text — matching the original closer scan, which
 * skips a mismatched run entirely rather than re-examining
 * its interior (so a 1-tick opener does not close inside
 * ```` `` ````).
 */
const codeSpan: Parser<Inline, null> = pipe(
  tickRun,
  andThen<SoftStr, Inline, null>(
    (open: SoftStr) =>
      map<ReadonlyArray<SoftStr>, Inline>(
        (body: ReadonlyArray<SoftStr>): Inline =>
          inlineCode(trimCode(join(body))),
      )(
        left(
          many<SoftStr, null>(
            or<SoftStr, null>(
              pipe(
                tickRun,
                andThen<SoftStr, SoftStr, null>(
                  (r: SoftStr) =>
                    r.length === open.length
                      ? fail("code span closer")
                      : succeed(r),
                ),
              ),
              noneOf("`"),
            ),
          ),
          literal(open),
        ),
      ),
  ),
);

/**
 * `**…**`. The body is `many1`, never `many`: the original
 * requires the closer to sit strictly past the opener, so
 * `****` opens nothing and falls through to emphasis and
 * then to literal text.
 */
const strongP = (
  rawHtml: boolean,
): Parser<Inline, null> =>
  map<ReadonlyArray<SoftStr>, Inline>(
    (cs: ReadonlyArray<SoftStr>): Inline =>
      strong(renderInline(join(cs), rawHtml)),
  )(
    right(
      literal("**"),
      left(
        many1<SoftStr, null>(
          right(
            notFollowedBy(literal("**")),
            anyChar,
          ),
        ),
        literal("**"),
      ),
    ),
  );

/** `*…*`; the body cannot contain a star. */
const emphP = (
  rawHtml: boolean,
): Parser<Inline, null> =>
  map<ReadonlyArray<SoftStr>, Inline>(
    (cs: ReadonlyArray<SoftStr>): Inline =>
      emph(renderInline(join(cs), rawHtml)),
  )(
    right(
      char("*"),
      left(
        many1<SoftStr, null>(noneOf("*")),
        char("*"),
      ),
    ),
  );

/**
 * One scan step. The branch order is the grammar: image
 * before link (`![` would otherwise read as `[`), raw HTML
 * only when enabled, code before strong before emph, and
 * finally any single character as a literal.
 */
const piece = (
  rawHtml: boolean,
): Parser<Piece, null> =>
  or<Piece, null>(
    map<Inline, Piece>(nodePiece)(
      or<Inline, null>(
        imageP,
        or<Inline, null>(
          linkP(rawHtml),
          or<Inline, null>(
            rawHtml
              ? htmlToken
              : fail("raw html disabled"),
            or<Inline, null>(
              codeSpan,
              or<Inline, null>(
                strongP(rawHtml),
                emphP(rawHtml),
              ),
            ),
          ),
        ),
      ),
    ),
    map<SoftStr, Piece>(charPiece)(anyChar),
  );

/**
 * Folds the scan's pieces into the node list, merging every
 * literal-character run into ONE {@link inlineText} and
 * applying the newline rules against the pending run: a
 * trailing `\` or two spaces makes a hard break, anything
 * else a soft break (one space).
 */
const assemble = (
  pieces: ReadonlyArray<Piece>,
): ReadonlyArray<Inline> => {
  const out: Array<Inline> = [];
  let buf = "";
  const flush = (): void => {
    if (buf !== "") {
      out.push(inlineText(buf));
      buf = "";
    }
  };
  pieces.forEach((p: Piece): void => {
    if (p.kind === "node") {
      flush();
      out.push(p.node);
      return;
    }
    if (p.ch !== "\n") {
      buf = `${buf}${p.ch}`;
      return;
    }
    if (buf.endsWith("\\")) {
      buf = buf.slice(0, -1);
      flush();
      out.push(lineBreak());
      return;
    }
    if (buf.endsWith("  ")) {
      buf = buf.replace(/ +$/, "");
      flush();
      out.push(lineBreak());
      return;
    }
    buf = `${buf} `;
  });
  flush();
  return out;
};

/**
 * Scans a single (already block-stripped) source line into
 * an ordered {@link Inline} sequence over the plggpress
 * inline subset: `` `code` ``, `**strong**`, `*emph*`,
 * `[text](href)`, `![alt](src)`, and hard line breaks (a
 * trailing `\` or two spaces before a newline). With
 * `rawHtml` off (the default) everything else — including
 * any raw `<`/`>` — accumulates as literal
 * {@link inlineText}, which the renderer HTML-escapes (the
 * v1 raw-HTML decision, see `spike-decisions.md` §6c). With
 * `rawHtml` on, a single raw HTML tag token becomes an
 * {@link htmlSpan} emitted verbatim, while any `<` that does
 * not open a tag stays literal (escaped) text. Code spans
 * are verbatim and never re-scanned; strong/emph/link text
 * recurse under the same `rawHtml`.
 *
 * A plgg-parser grammar: PEG ordered choice supplies the
 * branch precedence the original encoded in its scan order,
 * and {@link assemble} merges the literal runs the grammar
 * emits character by character.
 */
export const renderInline = (
  line: SoftStr,
  rawHtml: boolean = false,
): ReadonlyArray<Inline> =>
  pipe(
    run(
      many<Piece, null>(piece(rawHtml)),
      line,
      null,
    ),
    matchResult(
      // Unreachable: `many` succeeds on zero matches and
      // `anyChar` consumes anything a markup branch
      // rejects, so the scan cannot fail.
      (): ReadonlyArray<Inline> => [],
      assemble,
    ),
  );

/**
 * The heading's **plain text** with inline markup
 * resolved away — code/emph/strong/link contribute their
 * text, images their alt, line breaks a space. This is
 * the exact string VitePress slugifies (backticks gone,
 * link text kept), so it is the slug source (see
 * `slugify`).
 */
export const plainText = (
  inlines: ReadonlyArray<Inline>,
): SoftStr =>
  inlines
    .map((node): SoftStr =>
      match(node)(
        [
          text$(),
          ({ content }): SoftStr => content.value,
        ],
        [
          code$(),
          ({ content }): SoftStr => content.value,
        ],
        [
          emph$(),
          ({ content }): SoftStr =>
            plainText(content.children),
        ],
        [
          strong$(),
          ({ content }): SoftStr =>
            plainText(content.children),
        ],
        [
          link$(),
          ({ content }): SoftStr =>
            plainText(content.children),
        ],
        [
          image$(),
          ({ content }): SoftStr => content.alt,
        ],
        [lineBreak$(), (): SoftStr => " "],
        // a raw inline HTML tag contributes no slug text
        [htmlSpan$(), (): SoftStr => ""],
      ),
    )
    .join("");
