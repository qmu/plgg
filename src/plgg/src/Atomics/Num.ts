import {
  newOk,
  newErr,
  Result,
  InvalidError,
  Refinable0,
  Castable0,
  JsonSerializer,
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
export const numRefinable: Refinable0<Num> = {
  is,
};
/**
 * Exported type guard function for number values.
 */
export const { is: isNum } = numRefinable;

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
/**
 * Exported safe casting function for number values.
 */
export const { as: asNum } = numCastable;

// --------------------------------
// JsonReady
// --------------------------------

export type JsonReadyNum = Num;

export const isJsonReadyNum = isNum;

/**
 * JsonSerializable instance for number values.
 */
export const numJsonSerializable: JsonSerializer<
  Num,
  JsonReadyNum
> = {
  toJsonReady: (value: Num) => value,
  fromJsonReady: (jsonReady: Num) => jsonReady,
};
export const {
  toJsonReady: toJsonReadyNum,
  fromJsonReady: fromJsonReadyNum,
} = numJsonSerializable;
