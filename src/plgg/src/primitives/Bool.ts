import {
  Procedural,
  ok,
  err,
  success,
  fail,
  ValidationError,
} from "plgg/index";

/**
 * Boolean primitive type.
 */
export type t = boolean;

/**
 * Type guard for boolean.
 */
export const is = (value: unknown): value is t => typeof value === "boolean";

/**
 * Type guard for boolean.
 */
export const cast = (value: unknown): Procedural<t> =>
  Promise.resolve(
    is(value) ? ok(value) : err(new ValidationError("Value is not a boolean")),
  );

/**
 * Validates value is true.
 */
export const isTrue = (value: unknown): Procedural<t> =>
  is(value) && value === true
    ? success(true)
    : fail(new ValidationError("Value is not true"));

/**
 * Validates value is false.
 */
export const isFalse = (value: unknown): Procedural<t> =>
  is(value) && value === false
    ? success(false)
    : fail(new ValidationError("Value is not false"));
