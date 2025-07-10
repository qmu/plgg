import { Result, ok, err, ValidationError } from "plgg/index";

/**
 * String primitive type.
 */
export type Str = string;

/**
 * Type guard for string.
 */
export const isStr = (value: unknown): value is Str =>
  typeof value === "string";

/**
 * Type guard for string.
 */
export const castStr = (value: unknown): Result<Str, ValidationError> =>
  isStr(value)
    ? ok(value)
    : err(new ValidationError({ message: `${value} is not a string` }));

/**
 * Validates string length is greater than threshold.
 */
export const lenGt =
  (len: number) =>
  (a: string): Result<Str, ValidationError> =>
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
  (a: string): Result<Str, ValidationError> =>
    a.length < len
      ? ok(a)
      : err(
          new ValidationError({
            message: `The string ${a} is not shorter than ${len}`,
          }),
        );
