import {
  newOk,
  newErr,
  Result,
  InvalidError,
  Refinable0,
  Castable0,
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
 * Refinable instance for number type guards.
 */
export const numRefinable: Refinable0<Num> = {
  is,
};

/**
 * Castable instance for number safe casting.
 */
export const numCastable: Castable0<Num> = {
  as: (
    value: unknown,
  ): Result<Num, InvalidError> =>
    is(value)
      ? newOk(Number(value))
      : newErr(
          new InvalidError({
            message: "Value is not a number",
          }),
        ),
};

export const { is: isNum } = numRefinable;
export const { as: asNum } = numCastable;
