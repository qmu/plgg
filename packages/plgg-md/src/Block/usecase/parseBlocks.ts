import {
  SoftStr,
  Int,
  Option,
  Result,
  InvalidError,
  invalidError,
  some,
  none,
  ok,
  err,
  isOk,
  isErr,
  isSome,
  pipe,
  fromNullable,
  getOr,
  mapOption,
} from "plgg";
import {
  Block,
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
} from "plgg-md/Block/model/Block";

// ---------------------------------------------------------------------------
// Line grammar — the bounded plggpress subset
// (`spike-decisions.md` §7). Everything outside it
// falls through to a paragraph (raw HTML included).
// ---------------------------------------------------------------------------

/** Opening/closing fence with a captured info string. */
const FENCE_RE =
  /^(```+|~~~+)[ \t]*([^\s`~]*)[ \t]*$/;
/** A bare closing fence (no info string). */
const FENCE_CLOSE_RE = /^(```+|~~~+)[ \t]*$/;
/** `:{3,} kind [title]` — a container directive opener. */
const CONTAINER_OPEN_RE =
  /^(:{3,})[ \t]*([A-Za-z][\w-]*)[ \t]*(.*)$/;
/** A bare `:{3,}` container close. */
const CONTAINER_CLOSE_RE = /^(:{3,})[ \t]*$/;
/** ATX heading `#`..`######` with optional closing hashes. */
const HEADING_RE =
  /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
/** Thematic break: 3+ of `-`/`*`/`_`, spaces allowed. */
const HR_RE =
  /^ {0,3}([-*_])([ \t]*\1){2,}[ \t]*$/;
/** Blockquote line. */
const QUOTE_RE = /^ {0,3}>[ \t]?(.*)$/;
/** Unordered list item. */
const UL_RE = /^([ \t]*)([-*+])[ \t]+(.*)$/;
/** Ordered list item. */
const OL_RE = /^([ \t]*)(\d+)[.)][ \t]+(.*)$/;
/** Pipe-table header/body separator row. */
const TABLE_SEP_RE =
  /^[ \t]*\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?[ \t]*$/;

/**
 * The captured groups of a regex match, each absent
 * group defaulted to `""` — a no-`as` reader over
 * `RegExpMatchArray`'s `string | undefined` slots.
 */
const groups = (
  re: RegExp,
  line: SoftStr,
): Option<ReadonlyArray<SoftStr>> =>
  pipe(
    fromNullable(line.match(re)),
    mapOption(
      (m): ReadonlyArray<SoftStr> =>
        m.map((g) =>
          pipe(fromNullable(g), getOr("")),
        ),
    ),
  );

/** Reads capture group `i`, defaulting to `""`. */
const group = (
  gs: ReadonlyArray<SoftStr>,
  i: number,
): SoftStr =>
  pipe(fromNullable(gs[i]), getOr(""));

/** Reads line `k`, defaulting to `""` past the end. */
const lineAt = (
  lines: ReadonlyArray<SoftStr>,
  k: number,
): SoftStr =>
  pipe(fromNullable(lines[k]), getOr(""));

/** Count of leading space/tab characters. */
const indentOf = (line: SoftStr): Int =>
  pipe(groups(/^([ \t]*)/, line), (gs) =>
    isSome(gs) ? group(gs.content, 1).length : 0,
  );

/** A block span: the produced {@link Block} and the next unconsumed line. */
type Span = Readonly<{
  block: Block;
  next: number;
}>;

/**
 * Parses a Markdown body into a flat {@link Block}
 * sequence over the plggpress subset. Inline markup is
 * NOT parsed here (that is the render ticket); raw HTML
 * and any out-of-subset line ride along as {@link para}
 * text. Failures — an unterminated fence, a
 * colon-count-mismatched container, a malformed pipe
 * table — return an {@link InvalidError}, never a throw.
 */
export const parseBlocks = (
  source: SoftStr,
): Result<ReadonlyArray<Block>, InvalidError> =>
  parseBlockLines(source.split("\n"));

/**
 * The line-scan seam. A cursor (`i`) is advanced past
 * each construct's full span by the `take*` helpers;
 * blank lines separate blocks. This is an irreducible
 * imperative loop (a multi-line, look-ahead tokenizer),
 * isolated here and kept pure — it allocates a local
 * accumulator and returns it, mutating nothing outside.
 * Each `take*` receives the already-matched capture
 * groups, so no construct re-tests its own opener.
 */
const parseBlockLines = (
  lines: ReadonlyArray<SoftStr>,
): Result<ReadonlyArray<Block>, InvalidError> => {
  const blocks: Array<Block> = [];
  let error: Option<InvalidError> = none();
  let i = 0;
  while (i < lines.length) {
    const line = lineAt(lines, i);
    if (line.trim() === "") {
      i++;
      continue;
    }
    const fence = groups(FENCE_RE, line);
    if (isSome(fence)) {
      const res = takeFence(
        lines,
        i,
        fence.content,
      );
      if (isErr(res)) {
        error = some(res.content);
        break;
      }
      blocks.push(res.content.block);
      i = res.content.next;
      continue;
    }
    const copen = groups(CONTAINER_OPEN_RE, line);
    if (isSome(copen)) {
      const res = takeContainer(
        lines,
        i,
        copen.content,
      );
      if (isErr(res)) {
        error = some(res.content);
        break;
      }
      blocks.push(res.content.block);
      i = res.content.next;
      continue;
    }
    const head = groups(HEADING_RE, line);
    if (isSome(head)) {
      const res = takeHeading(i, head.content);
      if (isErr(res)) {
        error = some(res.content);
        break;
      }
      blocks.push(res.content.block);
      i = res.content.next;
      continue;
    }
    if (HR_RE.test(line)) {
      blocks.push(thematicBreak());
      i++;
      continue;
    }
    if (QUOTE_RE.test(line)) {
      const res = takeQuote(lines, i);
      if (isErr(res)) {
        error = some(res.content);
        break;
      }
      blocks.push(res.content.block);
      i = res.content.next;
      continue;
    }
    if (
      line.includes("|") &&
      TABLE_SEP_RE.test(lineAt(lines, i + 1))
    ) {
      const res = takeTable(lines, i);
      if (isErr(res)) {
        error = some(res.content);
        break;
      }
      blocks.push(res.content.block);
      i = res.content.next;
      continue;
    }
    if (isSome(listMatch(line))) {
      const span = takeList(lines, i);
      blocks.push(span.block);
      i = span.next;
      continue;
    }
    const span = takeParagraph(lines, i);
    blocks.push(span.block);
    i = span.next;
  }
  return isSome(error)
    ? err(error.content)
    : ok(blocks);
};

/**
 * Consumes a fenced code block. Captures the info
 * string verbatim (`None` when unlabeled) and the body
 * up to a same-character close fence. An unterminated
 * fence is a failure.
 */
const takeFence = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
  open: ReadonlyArray<SoftStr>,
): Result<Span, InvalidError> => {
  const marker = group(open, 1);
  const lang = group(open, 2);
  // forward scan for the matching close fence
  let j = i + 1;
  let closeIdx = -1;
  while (j < lines.length) {
    const close = groups(
      FENCE_CLOSE_RE,
      lineAt(lines, j),
    );
    if (
      isSome(close) &&
      sameFenceRun(
        marker,
        group(close.content, 1),
      )
    ) {
      closeIdx = j;
      break;
    }
    j++;
  }
  return closeIdx < 0
    ? err(
        invalidError({
          message: `Unterminated code fence opened with '${marker}'`,
        }),
      )
    : ok({
        block: codeFence(
          lang === ""
            ? none()
            : some<SoftStr>(lang),
          lines.slice(i + 1, closeIdx).join("\n"),
        ),
        next: closeIdx + 1,
      });
};

/** Same fence character (` ``` ` is not closed by `~~~`). */
const sameFenceRun = (
  open: SoftStr,
  close: SoftStr,
): boolean => open.charAt(0) === close.charAt(0);

/**
 * Consumes a `:::`-container, accepting 3+ MATCHING
 * colons: the close must repeat the open's colon count,
 * so `::::` nests around an inner `:::`. A colon-count
 * mismatch or a never-closed container is a failure. The
 * body is parsed recursively, so nested containers
 * become nested {@link callout}s.
 */
const takeContainer = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
  open: ReadonlyArray<SoftStr>,
): Result<Span, InvalidError> => {
  const openColons = group(open, 1).length;
  const kind = group(open, 2);
  const title = group(open, 3).trim();
  // colon-count stack: a close pops only its exact
  // match, so a wrong-length close is a hard mismatch.
  const stack: Array<number> = [openColons];
  let j = i + 1;
  let closeIdx = -1;
  let mismatch = false;
  while (j < lines.length) {
    const lj = lineAt(lines, j);
    const om = groups(CONTAINER_OPEN_RE, lj);
    const cm = groups(CONTAINER_CLOSE_RE, lj);
    if (isSome(om)) {
      stack.push(group(om.content, 1).length);
    } else if (isSome(cm)) {
      const k = group(cm.content, 1).length;
      const top = pipe(
        fromNullable(stack[stack.length - 1]),
        getOr(0),
      );
      if (top !== k) {
        mismatch = true;
        break;
      }
      stack.pop();
      if (stack.length === 0) {
        closeIdx = j;
        break;
      }
    }
    j++;
  }
  if (mismatch) {
    return err(
      invalidError({
        message: `Mismatched container fence: a close does not match the opening ${openColons}-colon run`,
      }),
    );
  }
  if (closeIdx < 0) {
    return err(
      invalidError({
        message: `Unterminated container '${kind}' opened with ${openColons} colons`,
      }),
    );
  }
  const children = parseBlockLines(
    lines.slice(i + 1, closeIdx),
  );
  return isErr(children)
    ? err(children.content)
    : ok({
        block: callout(
          kind,
          title === ""
            ? none()
            : some<SoftStr>(title),
          children.content,
        ),
        next: closeIdx + 1,
      });
};

/** Consumes one ATX heading line from its captured groups. */
const takeHeading = (
  i: number,
  gs: ReadonlyArray<SoftStr>,
): Result<Span, InvalidError> =>
  pipe(
    asHeadingLevel(group(gs, 1).length),
    (lvl) =>
      isOk(lvl)
        ? ok<Span>({
            block: heading(
              lvl.content,
              group(gs, 2),
            ),
            next: i + 1,
          })
        : err(lvl.content),
  );

/**
 * Consumes a run of `>` blockquote lines, then parses
 * the de-quoted body recursively.
 */
const takeQuote = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
): Result<Span, InvalidError> => {
  const body: Array<SoftStr> = [];
  let j = i;
  while (j < lines.length) {
    const gs = groups(QUOTE_RE, lineAt(lines, j));
    if (!isSome(gs)) {
      break;
    }
    body.push(group(gs.content, 1));
    j++;
  }
  const children = parseBlockLines(body);
  return isErr(children)
    ? err(children.content)
    : ok({
        block: quote(children.content),
        next: j,
      });
};

/**
 * Consumes a pipe table: header row, alignment row, then
 * body rows until a non-table line. A separator whose
 * column count disagrees with the header is malformed.
 */
const takeTable = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
): Result<Span, InvalidError> => {
  const header = splitRow(lineAt(lines, i));
  const align = splitRow(
    lineAt(lines, i + 1),
  ).map(parseAlign);
  if (align.length !== header.length) {
    return err(
      invalidError({
        message: `Malformed table: ${align.length} alignment cells for ${header.length} header cells`,
      }),
    );
  }
  const rows: Array<TableRow> = [];
  let j = i + 2;
  while (j < lines.length) {
    const lj = lineAt(lines, j);
    if (!lj.includes("|")) {
      break;
    }
    rows.push(splitRow(lj));
    j++;
  }
  return ok({
    block: table(header, align, rows),
    next: j,
  });
};

/** Splits a `| a | b |` row into trimmed cells. */
const splitRow = (line: SoftStr): TableRow =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

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

/** A matched list-item marker: its indent, ordering, and text. */
type ListMark = Readonly<{
  indent: Int;
  ordered: boolean;
  text: SoftStr;
}>;

/** Recognizes an unordered/ordered list-item line. */
const listMatch = (
  line: SoftStr,
): Option<ListMark> =>
  pipe(groups(UL_RE, line), (ul) =>
    isSome(ul)
      ? some<ListMark>({
          indent: group(ul.content, 1).length,
          ordered: false,
          text: group(ul.content, 3),
        })
      : pipe(groups(OL_RE, line), (ol) =>
          isSome(ol)
            ? some<ListMark>({
                indent: group(ol.content, 1)
                  .length,
                ordered: true,
                text: group(ol.content, 3),
              })
            : none(),
        ),
  );

/** Mutable item under construction (children grow as nested lists arrive). */
type ItemDraft = {
  text: SoftStr;
  children: Array<Block>;
};

/** Parses one list level, recursing for deeper-indented items. */
const parseListAt = (
  lines: ReadonlyArray<SoftStr>,
  start: number,
  baseIndent: number,
): Readonly<{
  items: ReadonlyArray<ListItem>;
  ordered: boolean;
  next: number;
}> => {
  const drafts: Array<ItemDraft> = [];
  let ordered = false;
  let first = true;
  let j = start;
  while (j < lines.length) {
    const line = lineAt(lines, j);
    const mark = listMatch(line);
    if (!isSome(mark)) {
      // continuation: an indented, marker-less,
      // non-blank line wraps the current item's text.
      const last = drafts[drafts.length - 1];
      if (
        last !== undefined &&
        line.trim() !== "" &&
        indentOf(line) > baseIndent
      ) {
        last.text = `${last.text} ${line.trim()}`;
        j++;
        continue;
      }
      break;
    }
    if (mark.content.indent < baseIndent) {
      break;
    }
    if (mark.content.indent > baseIndent) {
      const last = drafts[drafts.length - 1];
      if (last === undefined) {
        break;
      }
      const nested = parseListAt(
        lines,
        j,
        mark.content.indent,
      );
      last.children.push(
        list(nested.ordered, nested.items),
      );
      j = nested.next;
      continue;
    }
    if (first) {
      ordered = mark.content.ordered;
      first = false;
    }
    drafts.push({
      text: mark.content.text,
      children: [],
    });
    j++;
  }
  return {
    items: drafts.map(
      (d): ListItem => ({
        text: d.text,
        children: d.children,
      }),
    ),
    ordered,
    next: j,
  };
};

/** Consumes a whole list starting at `i`. */
const takeList = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
): Span => {
  const parsed = parseListAt(
    lines,
    i,
    indentOf(lineAt(lines, i)),
  );
  return {
    block: list(parsed.ordered, parsed.items),
    next: parsed.next,
  };
};

/**
 * Accumulates a paragraph: consecutive lines up to a
 * blank line or the start of another block. Raw HTML and
 * any out-of-subset line land here as literal text.
 */
const takeParagraph = (
  lines: ReadonlyArray<SoftStr>,
  i: number,
): Span => {
  const buf: Array<SoftStr> = [];
  let j = i;
  while (j < lines.length) {
    const line = lineAt(lines, j);
    if (line.trim() === "") {
      break;
    }
    if (j > i && startsBlock(lines, j)) {
      break;
    }
    buf.push(line);
    j++;
  }
  return {
    block: para(buf.join("\n")),
    next: j,
  };
};

/** Whether line `k` opens a non-paragraph block. */
const startsBlock = (
  lines: ReadonlyArray<SoftStr>,
  k: number,
): boolean => {
  const line = lineAt(lines, k);
  return (
    FENCE_RE.test(line) ||
    CONTAINER_OPEN_RE.test(line) ||
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    isSome(listMatch(line)) ||
    (line.includes("|") &&
      TABLE_SEP_RE.test(lineAt(lines, k + 1)))
  );
};
