import { Procedural, success, fail, ValidationError } from "plgg/index";

/**
 * String primitive type.
 */
export type t = string;

/**
 * Type guard for string.
 */
export const is = (value: unknown): value is t => typeof value === "string";

/**
 * Type guard for string.
 */
export const cast = (value: unknown): Procedural<t> =>
  is(value)
    ? success(value)
    : fail(new ValidationError(`${value} is not a string`));

/**
 * Validates string length is greater than threshold.
 */
export const lenGt =
  (len: number) =>
  (a: string): Procedural<t> =>
    a.length > len
      ? success(a)
      : fail(new ValidationError(`The string ${a} is not longer than ${len}`));

/**
 * Validates string length is less than threshold.
 */
export const lenLt =
  (len: number) =>
  (a: string): Procedural<t> =>
    a.length < len
      ? success(a)
      : fail(new ValidationError(`The string ${a} is not shorter than ${len}`));
