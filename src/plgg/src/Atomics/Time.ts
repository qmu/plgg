import { Result, ok, err, InvalidError, isStr } from "plgg/index";

/**
 * Date type alias for time representations.
 * Represents JavaScript Date objects.
 */
export type Time = Date;

/**
 * Type guard for Date objects.
 * 
 * @param value - Value to check
 * @returns True if value is a Date instance, false otherwise
 */
export const isTime = (value: unknown): value is Time => value instanceof Date;

/**
 * Type guard for valid date strings.
 * Checks if a string can be parsed into a valid Date.
 * 
 * @param value - Value to check
 * @returns True if value is a parseable date string
 */
const isDateString = (value: unknown): value is string =>
  isStr(value) && !isNaN(new Date(value).getTime());

/**
 * Validates and casts to Date.
 * Accepts Date objects or valid date strings.
 * 
 * @param value - Value to validate and cast
 * @returns Result containing Date or InvalidError
 * @example
 * const result1 = asTime(new Date()); // Ok(Date)
 * const result2 = asTime("2023-01-01"); // Ok(Date)
 * const invalid = asTime("invalid date"); // Err(InvalidError)
 */
export const asTime = (value: unknown): Result<Time, InvalidError> =>
  isTime(value)
    ? ok(value)
    : isDateString(value)
      ? ok(new Date(value))
      : err(new InvalidError({ message: "Value is not a Date" }));
