import { Result, newOk, newErr } from "plgg/index";

/**
 * Checks if a value is defined (not undefined).
 */
export const defined = <T>(
  value: T | undefined,
): Result<T, Error> =>
  value === undefined
    ? newErr(new Error("Value is undefined"))
    : newOk<T>(value);
