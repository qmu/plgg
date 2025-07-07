import { Result, ok, err, ValidationError, Str } from "plgg/index";

/**
 * Date type.
 */
export type t = Date;

/**
 * Type guard for Date.
 */
export const is = (value: unknown): value is t => value instanceof Date;

/**
 * Type guard for date string.
 */
const isDateString = (value: unknown): value is string =>
  Str.is(value) && !isNaN(new Date(value).getTime());

/**
 * Validates and casts to Date.
 */
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value)
    ? ok(value)
    : isDateString(value)
      ? ok(new Date(value))
      : err(new ValidationError({ message: "Value is not a Date" }));
