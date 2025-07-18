import { ok, err, Result, ValidationError } from "plgg/index";

/**
 * Number primitive type.
 */
export type Num = number;

/**
 * Type guard for number.
 */
export const isNum = (value: unknown): value is Num =>
  typeof value === "number" ||
  (typeof value === "bigint" &&
    value >= Number.MIN_SAFE_INTEGER &&
    value <= Number.MAX_SAFE_INTEGER);

/**
 * Type guard for number.
 */
export const castNum = (value: unknown): Result<Num, ValidationError> =>
  isNum(value)
    ? ok(Number(value))
    : err(new ValidationError({ message: "Value is not a number" }));
