import { Result, ok, err } from "plgg/index";

/**
 * Checks if a value is defined (not undefined).
 */
export const defined = <T>(
  value: T | undefined,
): Result<T, Error> =>
  value === undefined
    ? err(new Error("Value is undefined"))
    : ok<T>(value);
