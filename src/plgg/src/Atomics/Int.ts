import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  newOk,
  newErr,
} from "plgg/index";

/**
 * Represents JavaScript integer values within the safe integer range.
 */
export type Int = number;

/**
 * Type predicate to determine if a type is Int.
 */
export type IsInt<T> = T extends Int
  ? true
  : false;

/**
 * Type guard to check if a value is an Int.
 */
const is = (value: unknown): value is Int =>
  (typeof value === "number" && Number.isInteger(value)) ||
  (typeof value === "bigint" &&
    value >= Number.MIN_SAFE_INTEGER &&
    value <= Number.MAX_SAFE_INTEGER);

/**
 * Refinable instance for integer type guards.
 */
export const intRefinable: Refinable<Int> = {
  is,
};
/**
 * Exported type guard function for integer values.
 */
export const { is: isInt } = intRefinable;

/**
 * Castable instance for integer safe casting.
 */
export const intCastable: Castable<unknown, Int> = {
  as: (
    value: unknown,
  ): Result<Int, InvalidError> =>
    is(value)
      ? newOk(Number(value))
      : newErr(
          new InvalidError({
            message: "Value is not an integer",
          }),
        ),
};
/**
 * Exported safe casting function for integer values.
 */
export const { as: asInt } = intCastable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of Int values.
 */
export type JsonReadyInt = Int;

/**
 * Type guard for JSON-ready Int values.
 */
export const isJsonReadyInt = isInt;

/**
 * Datum instance for integer values.
 */
export const intJsonSerializable: JsonSerializable<
  Int,
  JsonReadyInt
> = {
  toJsonReady: (value: Int) => value,
  fromJsonReady: (jsonReady: Int) => jsonReady,
};
/**
 * Exported JSON serialization functions for Int values.
 */
export const {
  toJsonReady: toJsonReadyInt,
  fromJsonReady: fromJsonReadyInt,
} = intJsonSerializable;