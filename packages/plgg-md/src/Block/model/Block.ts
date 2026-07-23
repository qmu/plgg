import {
  Box,
  SoftStr,
  Option,
  Result,
  InvalidError,
  invalidError,
  box,
  pattern,
  isBoxWithTag,
  ok,
  err,
} from "plgg";

/**
 * A parsed Markdown document body as **pure data**:
 * a flat, ordered sequence of {@link Block}s. The
 * parser ({@link parseBlocks}) is the only producer;
 * everything is built through the constructors below,
 * never an ad-hoc literal, so the shape stays a single
 * source of truth for the later renderer.
 *
 * A `Box` union over the plggpress subset (see
 * `docs/plggpress-migration/spike-decisions.md` §7).
 * By default there is **no** raw-HTML variant: any stray
 * angle-brackets ride along inside {@link Para} text and
 * are HTML-escaped at render (the v1 decision). A site
 * that opts into `rawHtml` (see {@link RenderOptions})
 * gets the {@link HtmlBlock} variant, whose markup the
 * renderer emits verbatim.
 */
export type Block =
  | Heading
  | Para
  | CodeFence
  | List
  | Quote
  | Table
  | Callout
  | ThematicBreak
  | HtmlBlock;

/**
 * The six ATX heading depths. A nominal scalar with a
 * caster, so a depth that escapes the `#{1,6}` grammar
 * cannot silently become a `Heading`.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Type guard for a {@link HeadingLevel}. */
export const isHeadingLevel = (
  value: number,
): value is HeadingLevel =>
  Number.isInteger(value) &&
  value >= 1 &&
  value <= 6;

/** Caster for a {@link HeadingLevel} (Result, never throw). */
export const asHeadingLevel = (
  value: number,
): Result<HeadingLevel, InvalidError> =>
  isHeadingLevel(value)
    ? ok(value)
    : err(
        invalidError({
          message: `Heading level ${value} is out of range (1-6)`,
        }),
      );

/** Pipe-table column alignment, read from the separator row. */
export type TableAlign =
  "left" | "center" | "right" | "default";

/** An ATX heading `#`..`######`. */
export type Heading = Box<
  "Heading",
  Readonly<{
    level: HeadingLevel;
    text: SoftStr;
  }>
>;

/** A paragraph — also the lenient fallback for any out-of-subset line. */
export type Para = Box<
  "Para",
  Readonly<{ text: SoftStr }>
>;

/**
 * A fenced code block. `lang` is the raw fence token
 * (`Some("ts")`, `None` when unlabeled); `code` is the
 * verbatim body (escaped only at render).
 */
export type CodeFence = Box<
  "CodeFence",
  Readonly<{
    lang: Option<SoftStr>;
    code: SoftStr;
  }>
>;

/**
 * One list item: its (inline-unparsed) text plus any
 * child blocks — a nested {@link List} lives here.
 */
export type ListItem = Readonly<{
  text: SoftStr;
  children: ReadonlyArray<Block>;
}>;

/** An ordered or unordered list. */
export type List = Box<
  "List",
  Readonly<{
    ordered: boolean;
    items: ReadonlyArray<ListItem>;
  }>
>;

/** A blockquote, holding its own parsed child blocks. */
export type Quote = Box<
  "Quote",
  Readonly<{ children: ReadonlyArray<Block> }>
>;

/** One pipe-table row: its cells, left to right. */
export type TableRow = ReadonlyArray<SoftStr>;

/** A GFM pipe table. */
export type Table = Box<
  "Table",
  Readonly<{
    header: TableRow;
    align: ReadonlyArray<TableAlign>;
    rows: ReadonlyArray<TableRow>;
  }>
>;

/**
 * A `:::`-container directive (admonition). `kind` is
 * `tip`/`warning`/…; `title` is the optional custom
 * title after the kind; `children` are the parsed body
 * blocks. Accepts 3+ matching colons so `::::` nests
 * around `:::`.
 */
export type Callout = Box<
  "Callout",
  Readonly<{
    kind: SoftStr;
    title: Option<SoftStr>;
    children: ReadonlyArray<Block>;
  }>
>;

/** A thematic break (`---`/`***`/`___`). */
export type ThematicBreak = Box<
  "ThematicBreak",
  Readonly<Record<string, never>>
>;

/**
 * A raw-HTML passthrough block. `html` is the verbatim
 * source lines of a recognized block-level HTML construct
 * (a `<div>`/`<iframe>`/`<small class="…">` run), emitted
 * UNESCAPED at render. Only produced when `rawHtml` is
 * enabled (see {@link RenderOptions}); the default parser
 * never emits one, so untrusted markup can never reach the
 * verbatim seam without an explicit opt-in.
 */
export type HtmlBlock = Box<
  "HtmlBlock",
  Readonly<{ html: SoftStr }>
>;

/** Builds a {@link Heading}. */
export const heading = (
  level: HeadingLevel,
  text: SoftStr,
): Heading => box("Heading")({ level, text });

/** Builds a {@link Para}. */
export const para = (text: SoftStr): Para =>
  box("Para")({ text });

/** Builds a {@link CodeFence}. */
export const codeFence = (
  lang: Option<SoftStr>,
  code: SoftStr,
): CodeFence => box("CodeFence")({ lang, code });

/** Builds a {@link List}. */
export const list = (
  ordered: boolean,
  items: ReadonlyArray<ListItem>,
): List => box("List")({ ordered, items });

/** Builds a {@link Quote}. */
export const quote = (
  children: ReadonlyArray<Block>,
): Quote => box("Quote")({ children });

/** Builds a {@link Table}. */
export const table = (
  header: TableRow,
  align: ReadonlyArray<TableAlign>,
  rows: ReadonlyArray<TableRow>,
): Table => box("Table")({ header, align, rows });

/** Builds a {@link Callout}. */
export const callout = (
  kind: SoftStr,
  title: Option<SoftStr>,
  children: ReadonlyArray<Block>,
): Callout =>
  box("Callout")({ kind, title, children });

/** Builds a {@link ThematicBreak}. */
export const thematicBreak = (): ThematicBreak =>
  box("ThematicBreak")({});

/** Builds an {@link HtmlBlock}. */
export const htmlBlock = (
  html: SoftStr,
): HtmlBlock => box("HtmlBlock")({ html });

/** Type guard: is this {@link Block} a {@link Heading}? */
export const isHeading = isBoxWithTag("Heading");

/** Type guard: is this {@link Block} a {@link Para}? */
export const isPara = isBoxWithTag("Para");

/** Type guard: is this {@link Block} a {@link CodeFence}? */
export const isCodeFence =
  isBoxWithTag("CodeFence");

/** Type guard: is this {@link Block} a {@link List}? */
export const isList = isBoxWithTag("List");

/** Type guard: is this {@link Block} a {@link Quote}? */
export const isQuote = isBoxWithTag("Quote");

/** Type guard: is this {@link Block} a {@link Table}? */
export const isTable = isBoxWithTag("Table");

/** Type guard: is this {@link Block} a {@link Callout}? */
export const isCallout = isBoxWithTag("Callout");

/** Type guard: is this {@link Block} a {@link ThematicBreak}? */
export const isThematicBreak = isBoxWithTag(
  "ThematicBreak",
);

/** Type guard: is this {@link Block} an {@link HtmlBlock}? */
export const isHtmlBlock =
  isBoxWithTag("HtmlBlock");

/** `match` pattern for a {@link Heading}. */
export const heading$ = () =>
  pattern("Heading")();

/** `match` pattern for a {@link Para}. */
export const para$ = () => pattern("Para")();

/** `match` pattern for a {@link CodeFence}. */
export const codeFence$ = () =>
  pattern("CodeFence")();

/** `match` pattern for a {@link List}. */
export const list$ = () => pattern("List")();

/** `match` pattern for a {@link Quote}. */
export const quote$ = () => pattern("Quote")();

/** `match` pattern for a {@link Table}. */
export const table$ = () => pattern("Table")();

/** `match` pattern for a {@link Callout}. */
export const callout$ = () =>
  pattern("Callout")();

/** `match` pattern for a {@link ThematicBreak}. */
export const thematicBreak$ = () =>
  pattern("ThematicBreak")();

/** `match` pattern for an {@link HtmlBlock}. */
export const htmlBlock$ = () =>
  pattern("HtmlBlock")();
