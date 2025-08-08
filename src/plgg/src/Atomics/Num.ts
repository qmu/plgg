import { ok, err, Result, InvalidError } from "plgg/index";

/**
 * Number primitive type.
 * Represents JavaScript numbers, including integers and floating-point values.
 */
export type Num = number;

/**
 * Type guard for number.
 * Also accepts bigints that fit within JavaScript's safe integer range.
 * 
 * @param value - Value to check
 * @returns True if value is a number or safe bigint, false otherwise
 * @example
 * if (isNum(value)) {
 *   // TypeScript knows value is Num
 * }
 */
export const isNum = (value: unknown): value is Num =>
  typeof value === "number" ||
  (typeof value === "bigint" &&
    value >= Number.MIN_SAFE_INTEGER &&
    value <= Number.MAX_SAFE_INTEGER);

/**
 * Validates and casts unknown value to number.
 * Returns Ok with number if valid, Err with InvalidError if invalid.
 * 
 * @param value - Value to validate and cast
 * @returns Result containing number or InvalidError
 * @example
 * const result = asNum(42); // Ok(42)
 * const bigIntResult = asNum(42n); // Ok(42)
 * const invalid = asNum("not a number"); // Err(InvalidError)
 */
export const asNum = (value: unknown): Result<Num, InvalidError> =>
  isNum(value)
    ? ok(Number(value))
    : err(new InvalidError({ message: "Value is not a number" }));
