import { Box, SoftStr, box } from "plgg";

/** The empty body shared by every payload-less kind icon. */
type Empty = Readonly<Record<string, never>>;

/**
 * The nine lexeme classes the TS-lexer demo emits — the SAME
 * tag set as `plgg-highlight`'s `TokenKind`, so the migration
 * ticket can map demo tokens onto the shipped taxonomy
 * one-for-one. `plgg-parser` may NOT import `plgg-highlight`
 * (single upward dependency direction), so the tags are
 * redeclared here rather than shared.
 */
export type TokTag =
  | "Keyword"
  | "String"
  | "Number"
  | "Comment"
  | "Identifier"
  | "Punctuation"
  | "Regex"
  | "Template"
  | "Plain";

/**
 * A lexeme class as pure tagged data — a payload-less
 * {@link Box} icon, so a `match` over it is checked
 * exhaustively at compile time (mirroring `TokenKind`).
 */
export type TokKind = Box<TokTag, Empty>;

/** Builds a {@link TokKind} for `tag`. */
export const tokKind = (tag: TokTag): TokKind =>
  box(tag)({});

/**
 * One classified lexeme: its {@link TokKind} and the
 * verbatim source `text`. Concatenating every token's `text`
 * in order reconstructs the exact input (the round-trip
 * invariant), so whitespace and trivia ride along as
 * {@link TokKind} `Plain`/`Comment`.
 */
export type Tok = Box<
  "Tok",
  Readonly<{ kind: TokKind; text: SoftStr }>
>;

/** Builds a {@link Tok}. */
export const tok = (
  kind: TokKind,
  text: SoftStr,
): Tok => box("Tok")({ kind, text });
