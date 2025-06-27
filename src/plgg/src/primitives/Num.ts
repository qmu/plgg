import {
  Procedural,
  ok,
  err,
  success,
  fail,
  Result,
  ValidationError,
} from "plgg/index";

/**
 * Number primitive type.
 */
export type t = number;

/**
 * Type guard for number.
 */
export const is = (value: unknown): value is t => typeof value === "number";

/**
 * Type guard for number.
 */
export const cast = (value: unknown): Result<t, ValidationError> =>
  is(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a number" }));

/**
 * Validates number is greater than threshold.
 */
export const gt =
  (min: number) =>
  (a: number): Procedural<t> =>
    a > min
      ? success(a)
      : fail(
          new ValidationError({
            message: `The number ${a} is not greater than ${min}`,
          }),
        );
/**
 * Validates number is less than threshold.
 */
export const lt =
  (max: number) =>
  (a: number): Procedural<t> =>
    a < max
      ? success(a)
      : fail(
          new ValidationError({
            message: `The number ${a} is not less than ${max}`,
          }),
        );
