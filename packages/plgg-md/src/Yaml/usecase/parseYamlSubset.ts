import {
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isErr,
  mapResult,
  chainResult,
  matchResult,
  pipe,
  plggErrorMessage,
} from "plgg";
import {
  type Parser,
  run,
  char,
  anyChar,
  noneOf,
  literal,
  many,
  many1,
  map,
  or,
  right,
  left,
  between,
  sepBy,
  succeed,
  fail,
  andThen,
  eof,
} from "plgg-parser";
import {
  type YScalar,
  type YValue,
  type YEntry,
  type YamlMap,
  yStr,
  yNum,
  yBool,
  ySeq,
  yMap,
  yNone,
} from "plgg-md/Yaml/model/YamlValue";

// ---- scalar parsing (plgg-parser, positioned errors) ----

const join = (
  cs: ReadonlyArray<SoftStr>,
): SoftStr => cs.join("");

// `\x` → x (drop the backslash); `\\` → `\`; `\"` → `"`.
const dqInner: Parser<SoftStr, null> = map(join)(
  many<SoftStr, null>(
    or<SoftStr, null>(
      right(char("\\"), anyChar),
      noneOf('"\\'),
    ),
  ),
);
const dquoted: Parser<SoftStr, null> = between<
  SoftStr,
  SoftStr,
  null
>(
  char('"'),
  char('"'),
)(dqInner);

// single-quoted: `''` is an escaped `'`.
const sqInner: Parser<SoftStr, null> = map(join)(
  many<SoftStr, null>(
    or<SoftStr, null>(
      map<SoftStr, SoftStr>(() => "'")(
        literal("''"),
      ),
      noneOf("'"),
    ),
  ),
);
const squoted: Parser<SoftStr, null> = between<
  SoftStr,
  SoftStr,
  null
>(
  char("'"),
  char("'"),
)(sqInner);

const NUM_RE = /^-?\d+(\.\d+)?$/;
/**
 * YAML constructs no SCALAR may start with. `&`/`*`/`!`/
 * `|`/`>` are excluded because they carry expansion,
 * aliasing, or type coercion — they are the fail-closed
 * core and stay shut everywhere.
 *
 * `[` and `{` are here for a DIFFERENT reason, and it is
 * load-bearing: a flow collection is a perfectly
 * admissible {@link YValue}, but it is not a `YScalar`.
 * Keeping them excluded HERE is precisely what bounds
 * nesting — every element of a flow collection, and every
 * item of a block `- ` sequence, is classified by
 * {@link parseScalarValue}, so `[[a]]`, `[{a: 1}]`, and
 * `- [a]` are rejected without a depth counter anywhere.
 * {@link parseInlineValue} opens the flow spelling at the
 * one position where the shape fits. Do not "fix" this by
 * dropping `[`/`{` from the list — that would silently
 * unbound the subset.
 */
const EXCLUDED_LEAD = "&*!|>[{";

/**
 * Parses one scalar VALUE string (the RHS of `key:` or
 * after `- `) into a {@link YScalar}. Quoted strings run
 * through the combinator parser so an unterminated quote
 * is a positioned `Err` (fail-closed); an unquoted value
 * is classified — a number, `true`/`false`, or a plain
 * string. Excluded YAML syntax (anchors, tags, block
 * scalars, and a flow collection in SCALAR position — see
 * {@link EXCLUDED_LEAD}) is rejected, never silently
 * accepted.
 */
export const parseScalarValue = (
  raw: SoftStr,
): Result<YScalar, InvalidError> => {
  const s = raw.trim();
  if (s === "") {
    return err(
      invalidError({
        message: "empty scalar value",
      }),
    );
  }
  const lead = s[0];
  if (lead === '"') {
    return pipe(
      run(left(dquoted, eof), s, null),
      mapResult(yStr),
    );
  }
  if (lead === "'") {
    return pipe(
      run(left(squoted, eof), s, null),
      mapResult(yStr),
    );
  }
  if (
    lead !== undefined &&
    EXCLUDED_LEAD.includes(lead)
  ) {
    return err(
      invalidError({
        message: `unsupported YAML construct starting with ${JSON.stringify(lead)}`,
      }),
    );
  }
  return NUM_RE.test(s)
    ? ok(yNum(Number(s)))
    : s === "true"
      ? ok(yBool(true))
      : s === "false"
        ? ok(yBool(false))
        : ok(yStr(s));
};

// ---- flow collections (the inline spellings) ----

/** Run-of-spaces, discarded around flow punctuation. */
const spaces: Parser<
  ReadonlyArray<SoftStr>,
  null
> = many<SoftStr, null>(char(" "));

/** Lifts a {@link parseScalarValue} verdict into a parser. */
const asParsedScalar = (
  raw: SoftStr,
): Parser<YScalar, null> =>
  pipe(
    parseScalarValue(raw),
    matchResult(
      (e: InvalidError): Parser<YScalar, null> =>
        fail(plggErrorMessage(e)),
      (s: YScalar): Parser<YScalar, null> =>
        succeed(s),
    ),
  );

/**
 * An UNQUOTED flow element: the run up to the next
 * structural character, handed to {@link parseScalarValue}.
 * Routing it through that one classifier is what makes
 * `[1, true]` and its block spelling agree on types — and
 * what rejects a nested `[`/`{` element, since the raw run
 * keeps a leading bracket and `EXCLUDED_LEAD` catches it
 * there with a message naming the construct.
 */
const plainFlowScalar: Parser<YScalar, null> =
  pipe(
    map(join)(
      many1<SoftStr, null>(noneOf(",]}")),
    ),
    andThen<SoftStr, YScalar, null>(
      asParsedScalar,
    ),
  );

/**
 * One flow element. Quoted forms are tried first so a `,`
 * INSIDE a quoted scalar is content, not a separator
 * (`["a,b", c]` is two elements, not three).
 */
const flowScalar: Parser<YScalar, null> = or<
  YScalar,
  null
>(
  map<SoftStr, YScalar>(yStr)(dquoted),
  map<SoftStr, YScalar>(yStr)(squoted),
  plainFlowScalar,
);

/** `[a, b]` — the inline spelling of a `YSeq`. */
const flowSeq: Parser<
  ReadonlyArray<YScalar>,
  null
> = between<SoftStr, SoftStr, null>(
  left(char("["), spaces),
  right(spaces, char("]")),
)(sepBy<SoftStr, null>(char(","))(flowScalar));

/** `key: scalar` inside a `{…}`. */
const flowEntry: Parser<
  YEntry<YScalar>,
  null
> = pipe(
  map(join)(many1<SoftStr, null>(noneOf(":,]}"))),
  andThen<SoftStr, YEntry<YScalar>, null>(
    (rawKey: SoftStr) =>
      rawKey.trim() === ""
        ? fail("empty key")
        : pipe(
            right(char(":"), flowScalar),
            map((v: YScalar): YEntry<YScalar> => [
              rawKey.trim(),
              v,
            ]),
          ),
  ),
);

/** `{a: 1, b: 2}` — the inline spelling of a `YMap`. */
const flowMap: Parser<
  ReadonlyArray<YEntry<YScalar>>,
  null
> = between<SoftStr, SoftStr, null>(
  left(char("{"), spaces),
  right(spaces, char("}")),
)(sepBy<SoftStr, null>(char(","))(flowEntry));

/**
 * Rejects a repeated key, so a flow map obeys the subset's
 * duplicate-keys-are-an-error rule exactly as the block
 * spelling does — the two spellings must not disagree about
 * what is a valid document.
 */
const withoutDuplicateKeys = (
  entries: ReadonlyArray<YEntry<YScalar>>,
): Result<
  ReadonlyArray<YEntry<YScalar>>,
  InvalidError
> =>
  pipe(
    entries.map(([k]: YEntry<YScalar>) => k),
    (keys: ReadonlyArray<SoftStr>) =>
      keys.find(
        (k: SoftStr, idx: number) =>
          keys.indexOf(k) !== idx,
      ),
    (dup: SoftStr | undefined) =>
      dup === undefined
        ? ok(entries)
        : err(
            invalidError({
              message: `duplicate key ${JSON.stringify(dup)}`,
            }),
          ),
  );

/**
 * Parses an INLINE value — everything after `key:` on one
 * line — into a {@link YValue}. This is the ONE position
 * where a flow collection is admissible, and admitting it
 * widens the SPELLINGS accepted, never the shapes: `[a, b]`
 * denotes the same `YSeq` as the indented `- ` block, and
 * `{a: 1}` the same `YMap` as the indented block. Anything
 * that is not a flow collection falls through to
 * {@link parseScalarValue} unchanged.
 *
 * `eof` is part of the grammar, not decoration: it is what
 * makes `[a] junk` an error rather than a silently
 * truncated read.
 */
export const parseInlineValue = (
  raw: SoftStr,
): Result<YValue, InvalidError> => {
  const s = raw.trim();
  return s.startsWith("[")
    ? pipe(
        run(left(flowSeq, eof), s, null),
        mapResult(ySeq),
      )
    : s.startsWith("{")
      ? pipe(
          run(left(flowMap, eof), s, null),
          chainResult(withoutDuplicateKeys),
          mapResult(yMap),
        )
      : parseScalarValue(s);
};

// ---- line-oriented document assembly ----

type Line = Readonly<{
  no: number;
  indent: number;
  content: SoftStr;
}>;

const indentOf = (line: SoftStr): number =>
  line.length - line.trimStart().length;

const isSkippable = (content: SoftStr): boolean =>
  content.trim() === "" ||
  content.trimStart().startsWith("#");

const splitKey = (
  content: SoftStr,
): Result<
  Readonly<{ key: SoftStr; rest: SoftStr }>,
  InvalidError
> => {
  const trimmed = content.trim();
  const colon = trimmed.indexOf(":");
  return colon < 0
    ? err(
        invalidError({
          message: `expected 'key: value', found ${JSON.stringify(trimmed)}`,
        }),
      )
    : ok({
        key: trimmed.slice(0, colon).trim(),
        rest: trimmed.slice(colon + 1).trim(),
      });
};

const lineErr = (
  line: Line,
  reason: SoftStr,
): InvalidError =>
  invalidError({
    message: `frontmatter line ${line.no}: ${reason}`,
  });

/**
 * Parses the YAML SUBSET (see {@link YamlValue}) into a
 * {@link YamlMap}. Line-oriented for a bounded,
 * backtracking-safe grammar (no pathological blowup on
 * adversarial input — `policies/security.md`): top-level
 * `key:` entries at column 0, each value either inline
 * (a scalar or a flow collection — see
 * {@link parseInlineValue}), an indented `- ` sequence of
 * scalars, an indented one-level map of scalars, or
 * ABSENT (a bare `key:`, yielding `YNone`). Duplicate
 * keys, malformed lines, and unsupported constructs are
 * positioned `Err`s. Total: never throws.
 */
export const parseYamlSubset = (
  block: SoftStr,
): Result<YamlMap, InvalidError> => {
  const lines: ReadonlyArray<Line> = block
    .split("\n")
    .map((content, i) => ({
      no: i + 1,
      indent: indentOf(content),
      content,
    }));

  // gather the content lines (blank/comment dropped),
  // then fold top-level entries with their indented
  // children.
  const content = lines.filter(
    (l: Line) => !isSkippable(l.content),
  );

  const entries: Array<YEntry<YValue>> = [];
  const seen = new Set<SoftStr>();
  // imperative cursor over content lines — a bounded walk,
  // the documented exception to the no-loop rule.
  let i = 0;
  while (i < content.length) {
    const line = content[i];
    if (line === undefined) {
      break;
    }
    if (line.indent !== 0) {
      return err(
        lineErr(
          line,
          "unexpected indentation at document root",
        ),
      );
    }
    const head = splitKey(line.content);
    if (isErr(head)) {
      return err(
        lineErr(line, "expected 'key: value'"),
      );
    }
    const { key, rest } = head.content;
    if (key === "") {
      return err(lineErr(line, "empty key"));
    }
    if (seen.has(key)) {
      return err(
        lineErr(
          line,
          `duplicate key ${JSON.stringify(key)}`,
        ),
      );
    }
    seen.add(key);

    if (rest !== "") {
      // inline value: a scalar or a flow collection
      const v = parseInlineValue(rest);
      if (isErr(v)) {
        return err(
          lineErr(
            line,
            plggErrorMessage(v.content),
          ),
        );
      }
      entries.push([key, v.content]);
      i = i + 1;
      continue;
    }

    // block value: collect the indented children
    const children: Array<Line> = [];
    let j = i + 1;
    while (
      j < content.length &&
      (content[j]?.indent ?? 0) > 0
    ) {
      const child = content[j];
      if (child !== undefined) {
        children.push(child);
      }
      j = j + 1;
    }
    // A bare `key:` with no indented block is the ABSENT
    // value, not a malformed line: the document said the
    // key exists and said no more. `foldYaml` omits it, so
    // `forOptionProp` reads it as `None`.
    const blockVal: Result<YValue, InvalidError> =
      children.length === 0
        ? ok(yNone())
        : parseBlock(children);
    if (isErr(blockVal)) {
      return err(blockVal.content);
    }
    entries.push([key, blockVal.content]);
    i = j;
  }

  return ok(entries);
};

/**
 * Parses an indented child block as a sequence (`- `
 * lines) OR a one-level map (`key: scalar` lines) — the
 * only two block shapes the subset allows. A mix is an
 * error.
 */
const parseBlock = (
  children: ReadonlyArray<Line>,
): Result<YValue, InvalidError> => {
  const first = children[0];
  return first === undefined
    ? err(
        invalidError({ message: "empty block" }),
      )
    : first.content.trimStart().startsWith("- ")
      ? parseSeqBlock(children)
      : parseMapBlock(children);
};

const parseSeqBlock = (
  children: ReadonlyArray<Line>,
): Result<YValue, InvalidError> => {
  const items: Array<YScalar> = [];
  for (const line of children) {
    const t = line.content.trimStart();
    if (!t.startsWith("- ")) {
      return err(
        lineErr(
          line,
          "expected a '- ' sequence item",
        ),
      );
    }
    const v = parseScalarValue(t.slice(2));
    if (isErr(v)) {
      return err(
        lineErr(
          line,
          plggErrorMessage(v.content),
        ),
      );
    }
    items.push(v.content);
  }
  return ok(ySeq(items));
};

const parseMapBlock = (
  children: ReadonlyArray<Line>,
): Result<YValue, InvalidError> => {
  const entries: Array<YEntry<YScalar>> = [];
  const seen = new Set<SoftStr>();
  for (const line of children) {
    const head = splitKey(line.content);
    if (isErr(head)) {
      return err(
        lineErr(line, "expected 'key: value'"),
      );
    }
    const { key, rest } = head.content;
    if (key === "" || rest === "") {
      return err(
        lineErr(
          line,
          "nested map entries must be 'key: scalar'",
        ),
      );
    }
    if (seen.has(key)) {
      return err(
        lineErr(
          line,
          `duplicate key ${JSON.stringify(key)}`,
        ),
      );
    }
    seen.add(key);
    const v = parseScalarValue(rest);
    if (isErr(v)) {
      return err(
        lineErr(
          line,
          plggErrorMessage(v.content),
        ),
      );
    }
    entries.push([key, v.content]);
  }
  return ok(yMap(entries));
};
