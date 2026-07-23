import {
  Box,
  SoftStr,
  box,
  pattern,
  match,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax/domain/model/SourceRange";

/**
 * One S-expression node, as **pure data**: the uniform
 * expression tree the whole plgg-ir family works on. A
 * `Box` union over the closed lexical vocabulary —
 * symbols, strings, numbers, booleans, lists — each
 * carrying the {@link SourceRange} it was read from.
 * This layer assigns no domain meaning: it does not
 * know what `entity` or `policy` mean (design.md §18).
 */
export type Sexp =
  SymbolExp | StrExp | NumExp | BoolExp | ListExp;

/**
 * A bare symbol (`entity`, `length-between`, `>=`).
 */
export type SymbolExp = Box<
  "SymbolExp",
  Readonly<{ name: SoftStr; range: SourceRange }>
>;

/**
 * A double-quoted string literal, holding the decoded
 * value (escapes resolved).
 */
export type StrExp = Box<
  "StrExp",
  Readonly<{
    value: SoftStr;
    range: SourceRange;
  }>
>;

/**
 * An integer or decimal literal.
 */
export type NumExp = Box<
  "NumExp",
  Readonly<{ value: number; range: SourceRange }>
>;

/**
 * A `true` / `false` literal.
 */
export type BoolExp = Box<
  "BoolExp",
  Readonly<{
    value: boolean;
    range: SourceRange;
  }>
>;

/**
 * A parenthesized list of child expressions.
 */
export type ListExp = Box<
  "ListExp",
  Readonly<{
    items: ReadonlyArray<Sexp>;
    range: SourceRange;
  }>
>;

/** Builds a {@link SymbolExp}. */
export const symbolExp = (
  name: SoftStr,
  range: SourceRange,
): SymbolExp => box("SymbolExp")({ name, range });

/** Builds a {@link StrExp}. */
export const strExp = (
  value: SoftStr,
  range: SourceRange,
): StrExp => box("StrExp")({ value, range });

/** Builds a {@link NumExp}. */
export const numExp = (
  value: number,
  range: SourceRange,
): NumExp => box("NumExp")({ value, range });

/** Builds a {@link BoolExp}. */
export const boolExp = (
  value: boolean,
  range: SourceRange,
): BoolExp => box("BoolExp")({ value, range });

/** Builds a {@link ListExp}. */
export const listExp = (
  items: ReadonlyArray<Sexp>,
  range: SourceRange,
): ListExp => box("ListExp")({ items, range });

/**
 * Type guard: is this {@link Sexp} a
 * {@link SymbolExp}? Typed over `Sexp` (not `unknown`)
 * so it narrows in `filter`/`find` positions.
 */
export const isSymbolExp = (
  exp: Sexp,
): exp is SymbolExp =>
  exp.__tag === "SymbolExp";

/** Type guard: is this {@link Sexp} a {@link StrExp}? */
export const isStrExp = (
  exp: Sexp,
): exp is StrExp => exp.__tag === "StrExp";

/** Type guard: is this {@link Sexp} a {@link NumExp}? */
export const isNumExp = (
  exp: Sexp,
): exp is NumExp => exp.__tag === "NumExp";

/** Type guard: is this {@link Sexp} a {@link BoolExp}? */
export const isBoolExp = (
  exp: Sexp,
): exp is BoolExp => exp.__tag === "BoolExp";

/** Type guard: is this {@link Sexp} a {@link ListExp}? */
export const isListExp = (
  exp: Sexp,
): exp is ListExp => exp.__tag === "ListExp";

/** `match` pattern for a {@link SymbolExp}. */
export const symbolExp$ = () =>
  pattern("SymbolExp")();

/** `match` pattern for a {@link StrExp}. */
export const strExp$ = () => pattern("StrExp")();

/** `match` pattern for a {@link NumExp}. */
export const numExp$ = () => pattern("NumExp")();

/** `match` pattern for a {@link BoolExp}. */
export const boolExp$ = () =>
  pattern("BoolExp")();

/** `match` pattern for a {@link ListExp}. */
export const listExp$ = () =>
  pattern("ListExp")();

/**
 * The {@link SourceRange} of any {@link Sexp} node.
 */
export const sexpRange = (
  exp: Sexp,
): SourceRange =>
  match(exp)(
    [
      symbolExp$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      strExp$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      numExp$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      boolExp$(),
      ({ content }): SourceRange => content.range,
    ],
    [
      listExp$(),
      ({ content }): SourceRange => content.range,
    ],
  );

/**
 * Structural equality of two {@link Sexp} trees,
 * **ignoring source ranges** — the equality the
 * round-trip law `parse(print(parse(x))) = parse(x)`
 * is stated over, since printing canonically moves
 * every node to a new position.
 */
export const sexpEquals =
  (a: Sexp) =>
  (b: Sexp): boolean =>
    match(a)(
      [
        symbolExp$(),
        ({ content }): boolean =>
          isSymbolExp(b) &&
          b.content.name === content.name,
      ],
      [
        strExp$(),
        ({ content }): boolean =>
          isStrExp(b) &&
          b.content.value === content.value,
      ],
      [
        numExp$(),
        ({ content }): boolean =>
          isNumExp(b) &&
          b.content.value === content.value,
      ],
      [
        boolExp$(),
        ({ content }): boolean =>
          isBoolExp(b) &&
          b.content.value === content.value,
      ],
      [
        listExp$(),
        ({ content }): boolean =>
          isListExp(b) &&
          sexpsEqual(content.items)(
            b.content.items,
          ),
      ],
    );

/**
 * Structural equality of two {@link Sexp} sequences,
 * ignoring source ranges (see {@link sexpEquals}).
 */
export const sexpsEqual =
  (as: ReadonlyArray<Sexp>) =>
  (bs: ReadonlyArray<Sexp>): boolean =>
    // slice-pairing instead of `bs[i]`: an index read
    // under noUncheckedIndexedAccess would demand an
    // `undefined` guard the length check makes
    // unreachable (an uncoverable branch).
    as.length === bs.length &&
    as.every((a, i) =>
      bs
        .slice(i, i + 1)
        .every((b) => sexpEquals(a)(b)),
    );
