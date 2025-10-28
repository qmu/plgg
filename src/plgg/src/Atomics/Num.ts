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
 * Represents JavaScript number values including integers and floats.
 */
export type Num = number;

/**
 * Type predicate to determine if a type is Num.
 */
export type IsNum<T> = T extends Num
  ? true
  : false;

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
export const numRefinable: Refinable<Num> = {
  is,
};
/**
 * Exported type guard function for number values.
 */
export const { is: isNum } = numRefinable;

export const asNum = (
  value: unknown,
): Result<Num, InvalidError> =>
  is(value)
    ? newOk(Number(value))
    : newErr(
        new InvalidError({
          message: "Value is not a number",
        }),
      );

/**
 * Castable instance for number safe casting.
 */
export const numCastable: Castable<Num> = {
  as: asNum,
};

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of Num values.
 */
export type JsonReadyNum = Num;

/**
 * Type guard for JSON-ready Num values.
 */
export const isJsonReadyNum = isNum;

/**
 * Datum instance for number values.
 */
export const numJsonSerializable: JsonSerializable<
  Num,
  JsonReadyNum
> = {
  toJsonReady: (value: Num) => value,
  fromJsonReady: (jsonReady: Num) => jsonReady,
};
/**
 * Exported JSON serialization functions for Num values.
 */
export const {
  toJsonReady: toJsonReadyNum,
  fromJsonReady: fromJsonReadyNum,
} = numJsonSerializable;
