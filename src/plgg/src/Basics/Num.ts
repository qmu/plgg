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
 * Refinement instance for number validation and casting.
 * Provides type-safe number validation following the standard Refinement pattern.
 */
export const numRefinement: Refinement<Num> = {
  is: (value: unknown): value is Num =>
    typeof value === "number" ||
    (typeof value === "bigint" &&
      value >= Number.MIN_SAFE_INTEGER &&
      value <= Number.MAX_SAFE_INTEGER),
  as: (
    value: unknown,
  ): Result<Num, InvalidError> =>
    typeof value === "number" ||
    (typeof value === "bigint" &&
      value >= Number.MIN_SAFE_INTEGER &&
      value <= Number.MAX_SAFE_INTEGER)
      ? ok(Number(value))
      : err(
          new InvalidError({
            message: "Value is not a number",
          }),
        ),
};
export const { is: isNum, as: asNum } =
  numRefinement;
