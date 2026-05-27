import {
  Box,
  Result,
  InvalidError,
  ok,
  err,
  isInt,
  isBoxWithTag,
  box,
  toOption,
  getOr,
  pipe,
} from "plgg";

/**
 * An HTTP status code in the valid range, modeled the plgg way — a branded
 * `Box` over a number (mirroring `U16`), so an invalid number cannot be
 * mistaken for a status.
 */
export type HttpStatus = Box<"HttpStatus", number>;

/**
 * Shared validation: an integer in the HTTP status range 100–599.
 */
const qualify = (value: unknown): value is number =>
  isInt(value) && value >= 100 && value <= 599;

/**
 * Type guard for {@link HttpStatus}.
 */
export const isHttpStatus = (
  value: unknown,
): value is HttpStatus =>
  isBoxWithTag("HttpStatus")(value) &&
  qualify(value.content);

/**
 * Parses an unknown value into an {@link HttpStatus}.
 */
export const asHttpStatus = (
  value: unknown,
): Result<HttpStatus, InvalidError> =>
  isHttpStatus(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("HttpStatus")(value))
      : err(
          new InvalidError({
            message: `${String(value)} is not a valid HTTP status (100-599)`,
          }),
        );

/**
 * Total constructor for known-good status numbers: invalid input degrades to
 * 500 rather than throwing, keeping response builders total.
 */
export const statusOf = (n: number): HttpStatus =>
  pipe(
    asHttpStatus(n),
    toOption,
    getOr(box("HttpStatus")(500)),
  );
