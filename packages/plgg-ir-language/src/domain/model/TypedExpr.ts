import {
  Box,
  SoftStr,
  box,
  pattern,
  isBoxWithTag,
  match,
} from "plgg";
import {
  Sexp,
  SourceRange,
} from "plgg-ir-syntax";
import { SemType } from "plgg-ir-language/domain/model/SemType";

/**
 * A resolved, typed reference: which binding a name
 * resolved to and where. Reference kinds are never
 * interchangeable (design.md §36.4) — the kind rides
 * along so downstream passes can verify it.
 */
export type TypedRef = Readonly<{
  kind: SoftStr;
  name: SoftStr;
  type: SemType;
  declaredAt: SourceRange;
  referencedAt: SourceRange;
}>;

/**
 * Builds a {@link TypedRef}.
 */
export const typedRef = (
  kind: SoftStr,
  name: SoftStr,
  type: SemType,
  declaredAt: SourceRange,
  referencedAt: SourceRange,
): TypedRef => ({
  kind,
  name,
  type,
  declaredAt,
  referencedAt,
});

/**
 * One type-checked expression, as **pure data**: what
 * {@link checkExpr} produces from a syntax tree. Every
 * node knows its {@link SemType}, so consumers read
 * meaning without re-deriving it.
 */
export type TypedExpr =
  LitExpr | RefExpr | AppExpr;

/**
 * A literal (number / string / boolean), keeping its
 * source node for the range.
 */
export type LitExpr = Box<
  "LitExpr",
  Readonly<{ type: SemType; source: Sexp }>
>;

/**
 * A reference to a scope binding.
 */
export type RefExpr = Box<
  "RefExpr",
  Readonly<{ ref: TypedRef }>
>;

/**
 * An operator application, already signature-checked.
 */
export type AppExpr = Box<
  "AppExpr",
  Readonly<{
    operator: SoftStr;
    args: ReadonlyArray<TypedExpr>;
    type: SemType;
    range: SourceRange;
  }>
>;

/** Builds a {@link LitExpr}. */
export const litExpr = (
  type: SemType,
  source: Sexp,
): LitExpr => box("LitExpr")({ type, source });

/** Builds a {@link RefExpr}. */
export const refExpr = (ref: TypedRef): RefExpr =>
  box("RefExpr")({ ref });

/** Builds an {@link AppExpr}. */
export const appExpr = (
  operator: SoftStr,
  args: ReadonlyArray<TypedExpr>,
  type: SemType,
  range: SourceRange,
): AppExpr =>
  box("AppExpr")({ operator, args, type, range });

/** Type guard: is this {@link TypedExpr} a {@link LitExpr}? */
export const isLitExpr = isBoxWithTag("LitExpr");

/** Type guard: is this {@link TypedExpr} a {@link RefExpr}? */
export const isRefExpr = isBoxWithTag("RefExpr");

/** Type guard: is this {@link TypedExpr} an {@link AppExpr}? */
export const isAppExpr = isBoxWithTag("AppExpr");

/** `match` pattern for a {@link LitExpr}. */
export const litExpr$ = () =>
  pattern("LitExpr")();

/** `match` pattern for a {@link RefExpr}. */
export const refExpr$ = () =>
  pattern("RefExpr")();

/** `match` pattern for an {@link AppExpr}. */
export const appExpr$ = () =>
  pattern("AppExpr")();

/**
 * The {@link SemType} of any {@link TypedExpr}.
 */
export const typedExprType = (
  e: TypedExpr,
): SemType =>
  match(e)(
    [
      litExpr$(),
      ({ content }): SemType => content.type,
    ],
    [
      refExpr$(),
      ({ content }): SemType => content.ref.type,
    ],
    [
      appExpr$(),
      ({ content }): SemType => content.type,
    ],
  );
