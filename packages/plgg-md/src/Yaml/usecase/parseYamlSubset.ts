import {
  type SoftStr,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isErr,
  mapResult,
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
  map,
  or,
  right,
  left,
  between,
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
} from "plgg-md/Yaml/model/YamlValue";

// ---- scalar parsing (plgg-parser, positioned errors) ----

const join = (cs: ReadonlyArray<SoftStr>): SoftStr =>
  cs.join("");

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
// YAML constructs this bounded subset rejects outright.
const EXCLUDED_LEAD = "&*!|>[{";

/**
 * Parses one scalar VALUE string (the RHS of `key:` or
 * after `- `) into a {@link YScalar}. Quoted strings run
 * through the combinator parser so an unterminated quote
 * is a positioned `Err` (fail-closed); an unquoted value
 * is classified — a number, `true`/`false`, or a plain
 * string. Excluded YAML syntax (anchors, tags, block
 * scalars, flow collections) is rejected, never silently
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
 * `key:` entries at column 0, each value either inline, an
 * indented `- ` sequence of scalars, or an indented
 * one-level map of scalars. Duplicate keys, malformed
 * lines, and unsupported constructs are positioned `Err`s.
 * Total: never throws.
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
      return err(lineErr(line, "expected 'key: value'"));
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
      // inline scalar value
      const v = parseScalarValue(rest);
      if (isErr(v)) {
        return err(lineErr(line, plggErrorMessage(v.content)));
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
    if (children.length === 0) {
      return err(
        lineErr(
          line,
          `key ${JSON.stringify(key)} has no value`,
        ),
      );
    }
    const blockVal = parseBlock(children);
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
    ? err(invalidError({ message: "empty block" }))
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
        lineErr(line, plggErrorMessage(v.content)),
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
        lineErr(line, plggErrorMessage(v.content)),
      );
    }
    entries.push([key, v.content]);
  }
  return ok(yMap(entries));
};
