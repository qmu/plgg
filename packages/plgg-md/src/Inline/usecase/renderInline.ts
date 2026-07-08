import {
  SoftStr,
  Option,
  match,
  pipe,
  fromNullable,
  getOr,
  mapOption,
  isSome,
} from "plgg";
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

/** An image `![alt](src)` at the cursor. */
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]*)\)/;
/** A link `[text](href)` at the cursor. */
const LINK_RE = /^\[([^\]]*)\]\(([^)\s]*)\)/;
/**
 * A single raw inline-HTML token at the cursor (only
 * honored when `rawHtml` is enabled): an HTML comment, a
 * close tag, or an open/self-closing tag. Matching CommonMark's
 * raw-inline-HTML shape, only the TAG token is captured —
 * the text between an open and close tag flows on as
 * ordinary (escaped) {@link Text}, so `<small>x & y</small>`
 * renders the tags verbatim while its inner `&` still
 * escapes.
 */
const INLINE_HTML_RE =
  /^(?:<!--[\s\S]*?-->|<\/[a-zA-Z][a-zA-Z0-9-]*[ \t]*>|<[a-zA-Z][a-zA-Z0-9-]*(?:[ \t][^<>]*?)?\/?>)/;

/**
 * The captured groups of an anchored match (group 0 is
 * the full match, used to advance the cursor), each
 * absent slot defaulted to `""` — a no-`as` reader over
 * `RegExpMatchArray`'s `string | undefined` slots.
 */
const matchAt = (
  re: RegExp,
  rest: SoftStr,
): Option<ReadonlyArray<SoftStr>> =>
  pipe(
    fromNullable(rest.match(re)),
    mapOption((m): ReadonlyArray<SoftStr> =>
      m.map((g) =>
        pipe(fromNullable(g), getOr("")),
      ),
    ),
  );

/** Reads group `i` of a capture array, defaulting to `""`. */
const group = (
  gs: ReadonlyArray<SoftStr>,
  i: number,
): SoftStr =>
  pipe(fromNullable(gs[i]), getOr(""));

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
 * Finds the byte index where a same-length backtick-run
 * closer for an `n`-tick opener begins, scanning runs and
 * comparing their length. Returns `-1` when there is no
 * matching closer (the opener is then literal text).
 */
const findCodeClose = (
  s: SoftStr,
  from: number,
  n: number,
): number => {
  let j = from;
  while (j < s.length) {
    if (s.charAt(j) !== "`") {
      j++;
      continue;
    }
    let k = j;
    while (s.charAt(k) === "`") {
      k++;
    }
    if (k - j === n) {
      return j;
    }
    j = k;
  }
  return -1;
};

/**
 * Scans a single (already block-stripped) source line
 * into an ordered {@link Inline} sequence over the
 * plggpress inline subset: `` `code` ``, `**strong**`,
 * `*emph*`, `[text](href)`, `![alt](src)`, and hard line
 * breaks (a trailing `\` or two spaces before a
 * newline). With `rawHtml` off (the default) everything
 * else — including any raw `<`/`>` — accumulates as
 * literal {@link inlineText}, which the renderer
 * HTML-escapes (the v1 raw-HTML decision, see
 * `spike-decisions.md` §6c). With `rawHtml` on, a single
 * raw HTML tag token becomes an {@link htmlSpan} emitted
 * verbatim, while any `<` that does not open a tag stays
 * literal (escaped) text. Code spans are verbatim and
 * never re-scanned; strong/emph/link text recurse under
 * the same `rawHtml`.
 *
 * An irreducible left-to-right scan (look-ahead inline
 * tokenizer), isolated here and kept pure: it allocates a
 * local accumulator and a text buffer and returns the
 * accumulator, mutating nothing outside.
 */
export const renderInline = (
  line: SoftStr,
  rawHtml: boolean = false,
): ReadonlyArray<Inline> => {
  const out: Array<Inline> = [];
  let buf = "";
  // Flush the pending literal-text run as one Text node.
  const flush = (): void => {
    if (buf !== "") {
      out.push(inlineText(buf));
      buf = "";
    }
  };
  let i = 0;
  while (i < line.length) {
    const ch = line.charAt(i);
    const rest = line.slice(i);
    // Newline: a hard break when preceded by two spaces
    // or a backslash; otherwise a soft break (a space).
    if (ch === "\n") {
      if (buf.endsWith("\\")) {
        buf = buf.slice(0, -1);
        flush();
        out.push(lineBreak());
      } else if (buf.endsWith("  ")) {
        buf = buf.replace(/ +$/, "");
        flush();
        out.push(lineBreak());
      } else {
        buf = `${buf} `;
      }
      i++;
      continue;
    }
    // Image `![alt](src)` — checked before link (`![`).
    const img = matchAt(IMAGE_RE, rest);
    if (ch === "!" && isSome(img)) {
      flush();
      out.push(
        image(
          group(img.content, 2),
          group(img.content, 1),
        ),
      );
      i += group(img.content, 0).length;
      continue;
    }
    // Link `[text](href)` — text recurses.
    const lnk = matchAt(LINK_RE, rest);
    if (ch === "[" && isSome(lnk)) {
      flush();
      out.push(
        link(
          group(lnk.content, 2),
          renderInline(
            group(lnk.content, 1),
            rawHtml,
          ),
        ),
      );
      i += group(lnk.content, 0).length;
      continue;
    }
    // Raw inline HTML tag token — only when enabled. The
    // tag rides verbatim; text between tags flows on as
    // escaped Text.
    if (rawHtml && ch === "<") {
      const tag = matchAt(INLINE_HTML_RE, rest);
      if (isSome(tag)) {
        flush();
        out.push(htmlSpan(group(tag.content, 0)));
        i += group(tag.content, 0).length;
        continue;
      }
    }
    // Inline code: an n-backtick run closed by another
    // n-backtick run; body is verbatim.
    if (ch === "`") {
      let n = 0;
      while (line.charAt(i + n) === "`") {
        n++;
      }
      const close = findCodeClose(line, i + n, n);
      if (close >= 0) {
        flush();
        out.push(
          inlineCode(
            trimCode(line.slice(i + n, close)),
          ),
        );
        i = close + n;
        continue;
      }
      buf = `${buf}${line.slice(i, i + n)}`;
      i += n;
      continue;
    }
    // Strong `**…**` — checked before emphasis.
    if (rest.startsWith("**")) {
      const close = line.indexOf("**", i + 2);
      if (close > i + 2) {
        flush();
        out.push(
          strong(
            renderInline(
              line.slice(i + 2, close),
              rawHtml,
            ),
          ),
        );
        i = close + 2;
        continue;
      }
    }
    // Emphasis `*…*` (single star).
    if (ch === "*") {
      const close = line.indexOf("*", i + 1);
      if (close > i + 1) {
        flush();
        out.push(
          emph(
            renderInline(
              line.slice(i + 1, close),
              rawHtml,
            ),
          ),
        );
        i = close + 1;
        continue;
      }
    }
    // Any other character — including a raw `<`/`>` —
    // is literal text, escaped at render.
    buf = `${buf}${ch}`;
    i++;
  }
  flush();
  return out;
};

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
