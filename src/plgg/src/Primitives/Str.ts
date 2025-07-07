import { Result, ok, err, ValidationError } from "plgg/index";

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
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value)
    ? ok(value)
    : err(new ValidationError({ message: `${value} is not a string` }));

/**
 * Validates string length is greater than threshold.
 */
export const lenGt =
  (len: number) =>
  (a: string): Result<t, ValidationError> =>
    a.length > len
      ? ok(a)
      : err(
          new ValidationError({
            message: `The string ${a} is not longer than ${len}`,
          }),
        );

/**
 * Validates string length is less than threshold.
 */
export const lenLt =
  (len: number) =>
  (a: string): Result<t, ValidationError> =>
    a.length < len
      ? ok(a)
      : err(
          new ValidationError({
            message: `The string ${a} is not shorter than ${len}`,
          }),
        );
