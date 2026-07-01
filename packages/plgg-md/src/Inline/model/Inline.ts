import {
  Box,
  SoftStr,
  box,
  pattern,
  isBoxWithTag,
} from "plgg";

/**
 * One inline (phrasing-level) node, as **pure data**.
 * Produced by `renderInline` from a single line of
 * source and folded to a `plgg-view` phrasing tree by
 * the renderer. A `Box` union over the bounded
 * plgg-press inline subset (see
 * `docs/plgg-press-migration/spike-decisions.md` §7).
 *
 * There is intentionally **no** raw-HTML variant: a
 * stray `<`/`>` rides along inside {@link Text} and is
 * HTML-escaped at render (v1 decision §6c), so untrusted
 * angle-brackets can never become markup.
 */
export type Inline =
  | Text
  | Code
  | Emph
  | Strong
  | Link
  | Image
  | LineBreak;

/** A run of literal text (escaped at render). */
export type Text = Box<
  "Text",
  Readonly<{ value: SoftStr }>
>;

/**
 * An inline code span. `value` is verbatim — never
 * parsed further — and HTML-escaped at render.
 */
export type Code = Box<
  "Code",
  Readonly<{ value: SoftStr }>
>;

/** Emphasis `*…*` — its children parsed recursively. */
export type Emph = Box<
  "Emph",
  Readonly<{ children: ReadonlyArray<Inline> }>
>;

/** Strong emphasis `**…**` — children parsed recursively. */
export type Strong = Box<
  "Strong",
  Readonly<{ children: ReadonlyArray<Inline> }>
>;

/**
 * A link `[text](href)`. `href` is the raw target as
 * authored; the renderer routes it through the injected
 * link resolver. `children` are the (recursively parsed)
 * link-text inlines.
 */
export type Link = Box<
  "Link",
  Readonly<{
    href: SoftStr;
    children: ReadonlyArray<Inline>;
  }>
>;

/**
 * An image `![alt](src)`. `alt` is plain text; `src` is
 * the raw target, routed through the link resolver at
 * render.
 */
export type Image = Box<
  "Image",
  Readonly<{ src: SoftStr; alt: SoftStr }>
>;

/** A hard line break (`<br>`). */
export type LineBreak = Box<
  "LineBreak",
  Readonly<Record<string, never>>
>;

/** Builds a {@link Text}. */
export const inlineText = (
  value: SoftStr,
): Text => box("Text")({ value });

/** Builds a {@link Code}. */
export const inlineCode = (
  value: SoftStr,
): Code => box("Code")({ value });

/** Builds an {@link Emph}. */
export const emph = (
  children: ReadonlyArray<Inline>,
): Emph => box("Emph")({ children });

/** Builds a {@link Strong}. */
export const strong = (
  children: ReadonlyArray<Inline>,
): Strong => box("Strong")({ children });

/** Builds a {@link Link}. */
export const link = (
  href: SoftStr,
  children: ReadonlyArray<Inline>,
): Link => box("Link")({ href, children });

/** Builds an {@link Image}. */
export const image = (
  src: SoftStr,
  alt: SoftStr,
): Image => box("Image")({ src, alt });

/** Builds a {@link LineBreak}. */
export const lineBreak = (): LineBreak =>
  box("LineBreak")({});

/** Type guard: is this {@link Inline} a {@link Text}? */
export const isText = isBoxWithTag("Text");

/** Type guard: is this {@link Inline} a {@link Code}? */
export const isCode = isBoxWithTag("Code");

/** Type guard: is this {@link Inline} an {@link Emph}? */
export const isEmph = isBoxWithTag("Emph");

/** Type guard: is this {@link Inline} a {@link Strong}? */
export const isStrong = isBoxWithTag("Strong");

/** Type guard: is this {@link Inline} a {@link Link}? */
export const isLink = isBoxWithTag("Link");

/** Type guard: is this {@link Inline} an {@link Image}? */
export const isImage = isBoxWithTag("Image");

/** Type guard: is this {@link Inline} a {@link LineBreak}? */
export const isLineBreak =
  isBoxWithTag("LineBreak");

/** `match` pattern for a {@link Text}. */
export const text$ = () => pattern("Text")();

/** `match` pattern for a {@link Code}. */
export const code$ = () => pattern("Code")();

/** `match` pattern for an {@link Emph}. */
export const emph$ = () => pattern("Emph")();

/** `match` pattern for a {@link Strong}. */
export const strong$ = () => pattern("Strong")();

/** `match` pattern for a {@link Link}. */
export const link$ = () => pattern("Link")();

/** `match` pattern for an {@link Image}. */
export const image$ = () => pattern("Image")();

/** `match` pattern for a {@link LineBreak}. */
export const lineBreak$ = () =>
  pattern("LineBreak")();
