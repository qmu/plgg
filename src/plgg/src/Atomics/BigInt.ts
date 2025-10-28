import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  newOk,
  newErr,
  isObj,
  hasProp,
} from "plgg/index";

/**
 * Represents JavaScript BigInt values for arbitrary precision integers.
 */
export type BigInt = bigint;

/**
 * Type predicate to determine if a type is BigInt.
 */
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
export const bigIntRefinable: Refinable<BigInt> =
  {
    is,
  };
/**
 * Exported type guard function for BigInt values.
 */
export const { is: isBigInt } = bigIntRefinable;

export const asBigInt = (
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
};

/**
 * Castable instance for BigInt safe casting.
 */
export const bigIntCastable: Castable<BigInt> = {
  as: asBigInt,
};

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of BigInt values.
 */
export type JsonReadyBigInt = {
  type: "bigint";
  value: string;
};

/**
 * Type guard for JSON-ready BigInt values.
 */
export const isJsonReadyBigInt = (
  value: unknown,
): value is JsonReadyBigInt =>
  isObj(value) &&
  hasProp(value, "type") &&
  value.type === "bigint" &&
  hasProp(value, "value") &&
  typeof value.value === "string";

/**
 * Datum instance for BigInt values.
 */
export const bigIntJsonSerializable: JsonSerializable<
  BigInt,
  JsonReadyBigInt
> = {
  toJsonReady: (
    value: BigInt,
  ): JsonReadyBigInt => ({
    type: "bigint",
    value: value.toString(),
  }),
  fromJsonReady: (
    jsonReady: JsonReadyBigInt,
  ): BigInt => BigInt(jsonReady.value),
};
/**
 * Exported JSON serialization functions for BigInt values.
 */
export const {
  toJsonReady: toJsonReadyBigInt,
  fromJsonReady: fromJsonReadyBigInt,
} = bigIntJsonSerializable;
