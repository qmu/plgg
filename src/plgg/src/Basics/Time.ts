import {
  Result,
  newOk,
  newErr,
  InvalidError,
  isStr,
  Refinable0,
  Castable0,
} from "plgg/index";

/**
 * Date type alias for time representations.
 * Represents JavaScript Date objects.
 */
export type Time = Date;

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
export const timeRefinable: Refinable0<Time> = {
  is,
};
export const { is: isTime } = timeRefinable;

/**
 * Castable instance for Time safe casting.
 */
export const timeCastable: Castable0<Time> = {
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
export const { as: asTime } = timeCastable;
