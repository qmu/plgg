import {
  Result,
  ok,
  err,
  InvalidError,
  isStr,
  Refinement,
} from "plgg/index";

/**
 * Date type alias for time representations.
 * Represents JavaScript Date objects.
 */
export type Time = Date;

/**
 * Type guard for valid date strings.
 */
const isDateString = (
  value: unknown,
): value is string =>
  isStr(value) &&
  !isNaN(new Date(value).getTime());

/**
 * Refinement instance for Time validation and casting.
 * Provides type-safe Date validation following the standard Refinement pattern.
 */
export const timeRefinement: Refinement<Time> = {
  is: (value: unknown): value is Time =>
    value instanceof Date,
  as: (
    value: unknown,
  ): Result<Time, InvalidError> =>
    value instanceof Date
      ? ok(value)
      : isDateString(value)
        ? ok(new Date(value))
        : err(
            new InvalidError({
              message: "Value is not a Date",
            }),
          ),
};

export const { is: isTime, as: asTime } =
  timeRefinement;
