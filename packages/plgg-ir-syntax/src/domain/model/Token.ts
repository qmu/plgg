import {
  Box,
  SoftStr,
  box,
  pattern,
  isBoxWithTag,
  match,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax/domain/model/SourceRange";

/**
 * One lexical token, as **pure data**: the unit the
 * tokenizer produces and the reader consumes. Every
 * token carries the {@link SourceRange} it was read
 * from; atom tokens carry their decoded value (a
 * string's escapes are already resolved, a number is
 * already numeric).
 */
export type Token =
  | LParenTok
  | RParenTok
  | SymbolTok
  | StrTok
  | NumTok
  | BoolTok;

/** An opening `(`. */
export type LParenTok = Box<
  "LParenTok",
  Readonly<{ range: SourceRange }>
>;

/** A closing `)`. */
export type RParenTok = Box<
  "RParenTok",
  Readonly<{ range: SourceRange }>
>;

/** A bare symbol atom. */
export type SymbolTok = Box<
  "SymbolTok",
  Readonly<{ name: SoftStr; range: SourceRange }>
>;

/** A string literal atom (decoded value). */
export type StrTok = Box<
  "StrTok",
  Readonly<{
    value: SoftStr;
    range: SourceRange;
  }>
>;

/** A numeric literal atom. */
export type NumTok = Box<
  "NumTok",
  Readonly<{ value: number; range: SourceRange }>
>;

/** A `true` / `false` literal atom. */
export type BoolTok = Box<
  "BoolTok",
  Readonly<{
    value: boolean;
    range: SourceRange;
  }>
>;

/** Builds an {@link LParenTok}. */
export const lParenTok = (
  range: SourceRange,
): LParenTok => box("LParenTok")({ range });

/** Builds an {@link RParenTok}. */
export const rParenTok = (
  range: SourceRange,
): RParenTok => box("RParenTok")({ range });

/** Builds a {@link SymbolTok}. */
export const symbolTok = (
  name: SoftStr,
  range: SourceRange,
): SymbolTok => box("SymbolTok")({ name, range });

/** Builds a {@link StrTok}. */
export const strTok = (
  value: SoftStr,
  range: SourceRange,
): StrTok => box("StrTok")({ value, range });

/** Builds a {@link NumTok}. */
export const numTok = (
  value: number,
  range: SourceRange,
): NumTok => box("NumTok")({ value, range });

/** Builds a {@link BoolTok}. */
export const boolTok = (
  value: boolean,
  range: SourceRange,
): BoolTok => box("BoolTok")({ value, range });

/** Type guard: is this {@link Token} an {@link LParenTok}? */
export const isLParenTok =
  isBoxWithTag("LParenTok");

/** Type guard: is this {@link Token} an {@link RParenTok}? */
export const isRParenTok =
  isBoxWithTag("RParenTok");

/** `match` pattern for an {@link LParenTok}. */
export const lParenTok$ = () =>
  pattern("LParenTok")();

/** `match` pattern for an {@link RParenTok}. */
export const rParenTok$ = () =>
  pattern("RParenTok")();

/** `match` pattern for a {@link SymbolTok}. */
export const symbolTok$ = () =>
  pattern("SymbolTok")();

/** `match` pattern for a {@link StrTok}. */
export const strTok$ = () => pattern("StrTok")();

/** `match` pattern for a {@link NumTok}. */
export const numTok$ = () => pattern("NumTok")();

/** `match` pattern for a {@link BoolTok}. */
export const boolTok$ = () =>
  pattern("BoolTok")();

/**
 * The {@link SourceRange} of any {@link Token}.
 */
export const tokenRange = (
  token: Token,
): SourceRange =>
  match(token)(
    [
      lParenTok$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      rParenTok$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      symbolTok$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      strTok$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      numTok$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      boolTok$(),
      ({ content }): SourceRange => content.range,
    ],
  );
