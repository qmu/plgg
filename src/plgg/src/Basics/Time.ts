import {
  Result,
  newOk,
  newErr,
  InvalidError,
  isStr,
  Refinable,
  Castable,
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
export const timeCastable: Castable<Time> = {
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
