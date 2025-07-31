import { Result, ok, err, InvalidError, isStr } from "plgg/index";

/**
 * Date type.
 */
export type Time = Date;

/**
 * Type guard for Date.
 */
export const isTime = (value: unknown): value is Time => value instanceof Date;

/**
 * Type guard for date string.
 */
const isDateString = (value: unknown): value is string =>
  isStr(value) && !isNaN(new Date(value).getTime());

/**
 * Validates and casts to Date.
 */
export const asTime = (value: unknown): Result<Time, InvalidError> =>
  isTime(value)
    ? ok(value)
    : isDateString(value)
      ? ok(new Date(value))
      : err(new InvalidError({ message: "Value is not a Date" }));
