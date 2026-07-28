import {
  type SoftStr,
  type Option,
  some,
  none,
  pipe,
  matchOption,
  chainOption,
} from "plgg";
import {
  type Column,
  type Composition,
  columnWithSpan,
} from "plggmatic/Navigate/model/Composition";

/**
 * The composition's WIRE FORMAT — the one authority for
 * how a strip is written into a URL and read back out of
 * one. The server renderer and the client runtime both
 * compose from here; nothing re-derives the format.
 *
 * The URL's PATH is always the head column, so every
 * composition URL is also an ordinary, crawlable,
 * self-sufficient page. Two query parameters decorate it:
 *
 * - `c` — the columns to the head's right, in order;
 * - `q` — the head's own highlighted passage.
 *
 * Within `c`, entries are separated by `,` and a column's
 * route from its span by `:`. Those three characters (and
 * the escape character itself) are escaped INSIDE a field,
 * so a passage containing a comma or a colon is
 * unambiguous. That escaping is deliberately NOT
 * percent-encoding: the transport already percent-encodes
 * on the way out and decodes on the way in, and layering
 * a second percent round would make the two indis-
 * tinguishable. {@link decodeComposition} therefore takes
 * values a URL parser has ALREADY decoded (what
 * `URLSearchParams.get` or a server's query map hands
 * you), and {@link compositionQuery} emits values ready
 * to be pasted into a URL.
 */
export const restParam: SoftStr = "c";
export const spanParam: SoftStr = "q";

const ENTRY_SEP = ",";
const FIELD_SEP = ":";
const ESCAPE = "~";

/**
 * Make one field free of the separators. Order matters:
 * the escape character goes first, so its own escape can
 * never be mistaken for one of the others'.
 */
const escapeField = (value: SoftStr): SoftStr =>
  value
    .split(ESCAPE)
    .join(ESCAPE + "t")
    .split(ENTRY_SEP)
    .join(ESCAPE + "c")
    .split(FIELD_SEP)
    .join(ESCAPE + "f");

/**
 * The exact inverse, undone in reverse order. Total: a
 * stray `~` a human typed into the URL is left as itself
 * rather than failing the parse — a composition URL is
 * shared by hand, so it degrades, it never errors.
 */
const unescapeField = (value: SoftStr): SoftStr =>
  value
    .split(ESCAPE + "f")
    .join(FIELD_SEP)
    .split(ESCAPE + "c")
    .join(ENTRY_SEP)
    .split(ESCAPE + "t")
    .join(ESCAPE);

/**
 * Percent-encode a parameter value for emission, but keep
 * `/` and the two separators literal. All three are legal
 * in a query value, and a strip of `%2F`/`%2C`-riddled
 * routes is a worse thing to paste into a chat window
 * than a readable one. Sound because {@link escapeField}
 * has already run: no field can still contain a raw
 * separator by the time the value is joined, so restoring
 * them cannot introduce an ambiguity.
 */
const percent = (value: SoftStr): SoftStr =>
  encodeURIComponent(value)
    .split("%2F")
    .join("/")
    .split("%2C")
    .join(ENTRY_SEP)
    .split("%3A")
    .join(FIELD_SEP);

/**
 * One column from its already-split raw fields. An entry
 * with no route at all (`,,`) contributes nothing —
 * dropped, not defaulted.
 */
const columnFrom = (
  route: SoftStr,
  span: SoftStr,
): Option<Column> =>
  route === ""
    ? none()
    : some(
        columnWithSpan(
          unescapeField(route),
          span === ""
            ? none()
            : some(unescapeField(span)),
        ),
      );

/** Split one `c` entry at its FIRST field separator. */
const parseEntry = (
  raw: SoftStr,
): Option<Column> =>
  pipe(
    raw.indexOf(FIELD_SEP),
    (i: number): Option<Column> =>
      i < 0
        ? columnFrom(raw, "")
        : columnFrom(
            raw.slice(0, i),
            raw.slice(i + 1),
          ),
  );

/** Every parseable entry of a `c` value, in order. */
const parseRest = (
  raw: SoftStr,
): ReadonlyArray<Column> =>
  raw
    .split(ENTRY_SEP)
    .reduce<ReadonlyArray<Column>>(
      (
        acc: ReadonlyArray<Column>,
        entry: SoftStr,
      ): ReadonlyArray<Column> =>
        pipe(
          parseEntry(entry),
          matchOption(
            (): ReadonlyArray<Column> => acc,
            (
              column: Column,
            ): ReadonlyArray<Column> => [
              ...acc,
              column,
            ],
          ),
        ),
      [],
    );

/**
 * Read the composition a request carries: the route it is
 * on, plus the already-URL-decoded `c` and `q` values.
 * Total by construction — a malformed, truncated or
 * hand-typed `c` yields the columns that do parse, and in
 * the worst case the head alone. A composition URL must
 * always still be a page.
 */
export const decodeComposition = (
  route: SoftStr,
  rest: Option<SoftStr>,
  span: Option<SoftStr>,
): Composition => ({
  head: columnWithSpan(
    route,
    pipe(
      span,
      chainOption(
        (raw: SoftStr): Option<SoftStr> =>
          raw === ""
            ? none()
            : some(unescapeField(raw)),
      ),
    ),
  ),
  rest: pipe(
    rest,
    matchOption(
      (): ReadonlyArray<Column> => [],
      (raw: SoftStr): ReadonlyArray<Column> =>
        parseRest(raw),
    ),
  ),
});

/** One `c` entry: the route, and its span when marked. */
const encodeEntry = (column: Column): SoftStr =>
  escapeField(column.route) +
  pipe(
    column.span,
    matchOption(
      (): SoftStr => "",
      (span: SoftStr): SoftStr =>
        FIELD_SEP + escapeField(span),
    ),
  );

/**
 * The query parameters a composition needs, in emission
 * order (`c` then `q`). A composition showing one
 * unmarked document needs none, so its URL is the plain
 * page URL — the strip adds nothing to a link until it
 * has something to say.
 */
const restParams = (
  rest: ReadonlyArray<Column>,
): ReadonlyArray<readonly [SoftStr, SoftStr]> =>
  rest.length === 0
    ? []
    : [
        [
          restParam,
          rest.map(encodeEntry).join(ENTRY_SEP),
        ],
      ];

const paramsOf = (
  composition: Composition,
): ReadonlyArray<readonly [SoftStr, SoftStr]> => [
  ...restParams(composition.rest),
  ...pipe(
    composition.head.span,
    matchOption(
      (): ReadonlyArray<
        readonly [SoftStr, SoftStr]
      > => [],
      (
        span: SoftStr,
      ): ReadonlyArray<
        readonly [SoftStr, SoftStr]
      > => [[spanParam, escapeField(span)]],
    ),
  ),
];

/**
 * The composition's query string, `?`-prefixed, or the
 * empty string when the composition needs none.
 */
export const compositionQuery = (
  composition: Composition,
): SoftStr =>
  pipe(
    paramsOf(composition)
      .map(
        ([key, value]: readonly [
          SoftStr,
          SoftStr,
        ]): SoftStr => key + "=" + percent(value),
      )
      .join("&"),
    (query: SoftStr): SoftStr =>
      query === "" ? "" : "?" + query,
  );

/**
 * The whole composition as ONE addressable link: the head
 * route carrying the rest of the strip in its query. This
 * is what history is pushed with, and what a reader
 * copies out of the address bar.
 */
export const compositionHref = (
  composition: Composition,
): SoftStr =>
  composition.head.route +
  compositionQuery(composition);
