import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  Box,
  newOk,
  newErr,
  isBoxWithTag,
  isBigInt,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 64-bit signed integer (-9223372036854775808n to 9223372036854775807n).
 */
export type I64 = Box<"I64", bigint>;

/**
 * Type guard to check if a value is an I64.
 */
const is = (value: unknown): value is I64 =>
  isBoxWithTag("I64")(value) &&
  isBigInt(value.content) &&
  value.content >= -9223372036854775808n &&
  value.content <= 9223372036854775807n;

/**
 * Refinable instance for I64 type guards.
 */
export const i64Refinable: Refinable<I64> = {
  is,
};
/**
 * Exported type guard function for I64 values.
 */
export const { is: isI64 } = i64Refinable;

/**
 * Castable instance for I64 safe casting.
 */
export const i64Castable: Castable<I64> = {
  as: (
    value: unknown,
  ): Result<I64, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not an I64 (tag-content pair with bigint -9223372036854775808n to 9223372036854775807n)",
          }),
        ),
};
/**
 * Exported safe casting function for I64 values.
 */
export const { as: asI64 } = i64Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of I64 values as strings.
 */
export type JsonReadyI64 = Box<"I64", string>;

/**
 * Type guard for JSON-ready I64 values.
 */
export const isJsonReadyI64 = (
  value: unknown,
): value is JsonReadyI64 =>
  isBoxWithTag("I64")(value) &&
  typeof value.content === "string" &&
  /^-?\d+$/.test(value.content);

/**
 * JsonSerializable instance for I64 values.
 */
export const i64JsonSerializable: JsonSerializable<
  I64,
  JsonReadyI64
> = {
  toJsonReady: (value: I64) => ({
    __tag: "I64" as const,
    content: value.content.toString(),
  }),
  fromJsonReady: (jsonReady: JsonReadyI64) => ({
    __tag: "I64" as const,
    content: BigInt(jsonReady.content),
  }),
};
/**
 * Exported JSON serialization functions for I64 values.
 */
export const {
  toJsonReady: toJsonReadyI64,
  fromJsonReady: fromJsonReadyI64,
} = i64JsonSerializable;

