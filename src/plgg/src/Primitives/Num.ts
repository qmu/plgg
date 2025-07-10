import { ok, err, Result, ValidationError } from "plgg/index";

/**
 * Number primitive type.
 */
export type Num = number;

/**
 * Type guard for number.
 */
export const isNum = (value: unknown): value is Num =>
  typeof value === "number";

/**
 * Type guard for number.
 */
export const castNum = (value: unknown): Result<Num, ValidationError> =>
  isNum(value)
    ? ok(value)
    : err(new ValidationError({ message: "Value is not a number" }));

/**
 * Validates number is greater than threshold.
 */
export const gt =
  (min: number) =>
  (a: number): Result<Num, ValidationError> =>
    a > min
      ? ok(a)
      : err(
          new ValidationError({
            message: `The number ${a} is not greater than ${min}`,
          }),
        );
/**
 * Validates number is less than threshold.
 */
export const lt =
  (max: number) =>
  (a: number): Result<Num, ValidationError> =>
    a < max
      ? ok(a)
      : err(
          new ValidationError({
            message: `The number ${a} is not less than ${max}`,
          }),
        );
