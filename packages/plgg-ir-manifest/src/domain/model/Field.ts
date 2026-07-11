import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import {
  SemType,
  TypedExpr,
} from "plgg-ir-language";

/**
 * One declared validation rule of a field
 * (design.md §9): a closed `Box` union — the
 * vocabulary is `required`, `max-length`,
 * `length-between`, and `required-when` with a
 * boolean-typed condition. Unknown rules are compile
 * errors, never ignored.
 */
export type ValidationRule =
  | RequiredRule
  | MaxLengthRule
  | LengthBetweenRule
  | RequiredWhenRule;

/** `(required)` — the value must be present. */
export type RequiredRule = Box<
  "RequiredRule",
  Readonly<{ range: SourceRange }>
>;

/** `(max-length n)`. */
export type MaxLengthRule = Box<
  "MaxLengthRule",
  Readonly<{ max: number; range: SourceRange }>
>;

/** `(length-between min max)`. */
export type LengthBetweenRule = Box<
  "LengthBetweenRule",
  Readonly<{
    min: number;
    max: number;
    range: SourceRange;
  }>
>;

/**
 * `(required-when <condition>)` — conditionally
 * required; the condition is type-checked to boolean
 * against the entity's fields.
 */
export type RequiredWhenRule = Box<
  "RequiredWhenRule",
  Readonly<{
    condition: TypedExpr;
    range: SourceRange;
  }>
>;

/** Builds a {@link RequiredRule}. */
export const requiredRule = (
  range: SourceRange,
): RequiredRule => box("RequiredRule")({ range });

/** Builds a {@link MaxLengthRule}. */
export const maxLengthRule = (
  max: number,
  range: SourceRange,
): MaxLengthRule =>
  box("MaxLengthRule")({ max, range });

/** Builds a {@link LengthBetweenRule}. */
export const lengthBetweenRule = (
  min: number,
  max: number,
  range: SourceRange,
): LengthBetweenRule =>
  box("LengthBetweenRule")({ min, max, range });

/** Builds a {@link RequiredWhenRule}. */
export const requiredWhenRule = (
  condition: TypedExpr,
  range: SourceRange,
): RequiredWhenRule =>
  box("RequiredWhenRule")({ condition, range });

/** Type guard: is this a {@link RequiredRule}? */
export const isRequiredRule = (
  rule: ValidationRule,
): rule is RequiredRule =>
  rule.__tag === "RequiredRule";

/** `match` pattern for a {@link RequiredRule}. */
export const requiredRule$ = () =>
  pattern("RequiredRule")();

/** `match` pattern for a {@link MaxLengthRule}. */
export const maxLengthRule$ = () =>
  pattern("MaxLengthRule")();

/** `match` pattern for a {@link LengthBetweenRule}. */
export const lengthBetweenRule$ = () =>
  pattern("LengthBetweenRule")();

/** `match` pattern for a {@link RequiredWhenRule}. */
export const requiredWhenRule$ = () =>
  pattern("RequiredWhenRule")();

/**
 * One entity field of the canonical manifest IR: a
 * resolved name, its semantic type (nominal domain
 * meaning preserved over storage, design.md §8), the
 * optional persistence column, and its validation
 * rules.
 */
export type Field = Readonly<{
  name: SoftStr;
  type: SemType;
  column: Option<SoftStr>;
  validations: ReadonlyArray<ValidationRule>;
  range: SourceRange;
}>;

/**
 * Builds a {@link Field}.
 */
export const field = (
  name: SoftStr,
  type: SemType,
  column: Option<SoftStr>,
  validations: ReadonlyArray<ValidationRule>,
  range: SourceRange,
): Field => ({
  name,
  type,
  column,
  validations,
  range,
});
