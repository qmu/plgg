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
export const asStr = (value: unknown): Result<Str, ValidationError> =>
  isStr(value)
    ? ok(value)
    : err(new ValidationError({ message: `${value} is not a string` }));
