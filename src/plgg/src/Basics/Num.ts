import {
  ok,
  err,
  Result,
  InvalidError,
  Refinement,
} from "plgg/index";

/**
 * Number primitive type.
 * Represents JavaScript numbers, including integers and floating-point values.
 */
export type Num = number;

/**
 * Type guard to check if a value is a Num.
 */
const is = (value: unknown): value is Num =>
  typeof value === "number" ||
  (typeof value === "bigint" &&
    value >= Number.MIN_SAFE_INTEGER &&
    value <= Number.MAX_SAFE_INTEGER);

/**
 * Refinement instance for number validation and casting.
 * Provides type-safe number validation following the standard Refinement pattern.
 */
export const numRefinement: Refinement<Num> = {
  is,
  as: (
    value: unknown,
  ): Result<Num, InvalidError> =>
    is(value)
      ? ok(Number(value))
      : err(
          new InvalidError({
            message: "Value is not a number",
          }),
        ),
};
export const { is: isNum, as: asNum } =
  numRefinement;
