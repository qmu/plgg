import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  newOk,
  newErr,
  isStr,
} from "plgg/index";

/**
 * Represents JavaScript Date objects for time operations.
 */
export type Time = Date;

/**
 * Type predicate to determine if a type is Time.
 */
export type IsTime<T> = T extends Time
  ? true
  : false;

/**
 * Type guard for valid date strings.
 */
const isDateString = (
  value: unknown,
): value is string =>
  isStr(value) &&
  !isNaN(new Date(value).getTime());

/**
 * Type guard to check if a value is a Time.
 */
const is = (value: unknown): value is Time =>
  value instanceof Date;

/**
 * Refinable instance for Time type guards.
 */
export const timeRefinable: Refinable<Time> = {
  is,
};
/**
 * Exported type guard function for Time values.
 */
export const { is: isTime } = timeRefinable;

/**
 * Castable instance for Time safe casting.
 */
export const timeCastable: Castable<unknown, Time> = {
  as: (
    value: unknown,
  ): Result<Time, InvalidError> =>
    is(value)
      ? newOk(value)
      : isDateString(value)
        ? newOk(new Date(value as string))
        : newErr(
            new InvalidError({
              message: "Value is not a Date",
            }),
          ),
};
/**
 * Exported safe casting function for Time values.
 */
export const { as: asTime } = timeCastable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of Time values as ISO strings.
 */
export type JsonReadyTime = string;

/**
 * Type guard for JSON-ready Time values.
 * Only matches ISO 8601 date strings to avoid false positives.
 */
export const isJsonReadyTime = (value: unknown): value is JsonReadyTime =>
  isStr(value) && 
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
  !isNaN(new Date(value).getTime());

/**
 * JsonSerializable instance for Time values.
 */
export const timeJsonSerializable: JsonSerializable<
  Time,
  JsonReadyTime
> = {
  toJsonReady: (value: Time) => value.toISOString(),
  fromJsonReady: (jsonReady: string) => new Date(jsonReady),
};
/**
 * Exported JSON serialization functions for Time values.
 */
export const {
  toJsonReady: toJsonReadyTime,
  fromJsonReady: fromJsonReadyTime,
} = timeJsonSerializable;
