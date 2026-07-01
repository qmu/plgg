import { Box, SoftStr, box, pattern } from "plgg";

/** The empty body shared by every payload-less kind icon. */
type Empty = Readonly<Record<string, never>>;

/**
 * The classification of one lexeme, as **pure data**. A
 * `Box` union of nine payload-less icons — the bounded set
 * of `ts.SyntaxKind` groups the highlighter colors, plus
 * the {@link Plain} catch-all for trivia and any irregular
 * token (so {@link tokenize} never throws on exotic
 * input). Distinct tags (not a content-bearing enum) so
 * `match` over a {@link TokenKind} is checked exhaustively
 * at compile time.
 */
export type TokenKind =
  | Keyword
  | StringKind
  | NumberKind
  | Comment
  | Identifier
  | Punctuation
  | Regex
  | Template
  | Plain;

/** A reserved word / language keyword (`const`, `return`). */
export type Keyword = Box<"Keyword", Empty>;

/** A string literal (`"x"`, `'y'`). */
export type StringKind = Box<"String", Empty>;

/** A numeric or bigint literal (`42`, `1n`). */
export type NumberKind = Box<"Number", Empty>;

/** A line or block comment. */
export type Comment = Box<"Comment", Empty>;

/** An identifier or private identifier (`foo`, `#bar`). */
export type Identifier = Box<"Identifier", Empty>;

/** A punctuation / operator token (`=>`, `{`, `+`). */
export type Punctuation = Box<"Punctuation", Empty>;

/** A regular-expression literal. */
export type Regex = Box<"Regex", Empty>;

/** A template-string part (`` `a${ ``, `}b`, `` `c` ``). */
export type Template = Box<"Template", Empty>;

/**
 * Anything uncolored — whitespace, newlines, and any
 * token outside the classified groups. The fallback that
 * lets the scanner loop stay total.
 */
export type Plain = Box<"Plain", Empty>;

/** Builds a {@link Keyword} kind. */
export const keyword = (): Keyword =>
  box("Keyword")({});

/** Builds a {@link StringKind}. */
export const stringKind = (): StringKind =>
  box("String")({});

/** Builds a {@link NumberKind}. */
export const numberKind = (): NumberKind =>
  box("Number")({});

/** Builds a {@link Comment} kind. */
export const comment = (): Comment =>
  box("Comment")({});

/** Builds an {@link Identifier} kind. */
export const identifier = (): Identifier =>
  box("Identifier")({});

/** Builds a {@link Punctuation} kind. */
export const punctuation = (): Punctuation =>
  box("Punctuation")({});

/** Builds a {@link Regex} kind. */
export const regex = (): Regex =>
  box("Regex")({});

/** Builds a {@link Template} kind. */
export const template = (): Template =>
  box("Template")({});

/** Builds a {@link Plain} kind. */
export const plain = (): Plain =>
  box("Plain")({});

/** `match` pattern for a {@link Keyword}. */
export const keyword$ = () =>
  pattern("Keyword")();

/** `match` pattern for a {@link StringKind}. */
export const stringKind$ = () =>
  pattern("String")();

/** `match` pattern for a {@link NumberKind}. */
export const numberKind$ = () =>
  pattern("Number")();

/** `match` pattern for a {@link Comment}. */
export const comment$ = () =>
  pattern("Comment")();

/** `match` pattern for an {@link Identifier}. */
export const identifier$ = () =>
  pattern("Identifier")();

/** `match` pattern for a {@link Punctuation}. */
export const punctuation$ = () =>
  pattern("Punctuation")();

/** `match` pattern for a {@link Regex}. */
export const regex$ = () => pattern("Regex")();

/** `match` pattern for a {@link Template}. */
export const template$ = () =>
  pattern("Template")();

/** `match` pattern for a {@link Plain}. */
export const plain$ = () => pattern("Plain")();

/**
 * One classified lexeme: its {@link TokenKind} and the
 * verbatim source `text` (escaped only at render). The
 * source is reconstructed exactly by concatenating every
 * token's `text` in order, so whitespace and trivia ride
 * along as {@link Plain}.
 */
export type Token = Box<
  "Token",
  Readonly<{ kind: TokenKind; text: SoftStr }>
>;

/** Builds a {@link Token}. */
export const token = (
  kind: TokenKind,
  text: SoftStr,
): Token => box("Token")({ kind, text });
