import {
  newOk,
  newErr,
  Result,
  InvalidError,
  Refinable0,
  Castable0,
} from "plgg/index";

/**
 * BigInt primitive type.
 * Represents JavaScript BigInt values for arbitrary precision integers.
 */
export type BigInt = bigint;

export type IsBigInt<T> = T extends BigInt
  ? true
  : false;

/**
 * Type guard to check if a value is a BigInt.
 */
const is = (value: unknown): value is BigInt =>
  typeof value === "bigint";

/**
 * Refinable instance for BigInt type guards.
 */
export const bigIntRefinable: Refinable0<BigInt> =
  {
    is,
  };
export const { is: isBigInt } = bigIntRefinable;

/**
 * Castable instance for BigInt safe casting.
 */
export const bigIntCastable: Castable0<BigInt> = {
  as: (
    value: unknown,
  ): Result<BigInt, InvalidError> => {
    if (is(value)) {
      return newOk(value);
    }

    if (
      typeof value === "number" &&
      Number.isInteger(value)
    ) {
      return newOk(BigInt(value));
    }

    if (typeof value === "string") {
      try {
        return newOk(BigInt(value));
      } catch {
        return newErr(
          new InvalidError({
            message:
              "Value is not a valid BigInt",
          }),
        );
      }
    }

    return newErr(
      new InvalidError({
        message: "Value is not a BigInt",
      }),
    );
  },
};
export const { as: asBigInt } = bigIntCastable;

