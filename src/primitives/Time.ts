import { Procedural, success, fail, ValidationError, Str } from "@plgg/index";

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
export const cast = (value: unknown): Procedural<t> =>
  is(value)
    ? success(value)
    : isDateString(value)
      ? success(new Date(value))
      : fail(new ValidationError("Value is not a Date"));
