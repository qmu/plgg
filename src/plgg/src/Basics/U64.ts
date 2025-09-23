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
 * A variant with both a tag and content that must be a 64-bit unsigned integer (0n to 18446744073709551615n).
 */
export type U64 = Box<"U64", bigint>;

/**
 * Type guard to check if a value is a U64.
 */
const is = (value: unknown): value is U64 =>
  isBoxWithTag("U64")(value) &&
  isBigInt(value.content) &&
  value.content >= 0n &&
  value.content <= 18446744073709551615n;

/**
 * Refinable instance for U64 type guards.
 */
export const u64Refinable: Refinable<U64> = {
  is,
};
/**
 * Exported type guard function for U64 values.
 */
export const { is: isU64 } = u64Refinable;

/**
 * Castable instance for U64 safe casting.
 */
export const u64Castable: Castable<U64> = {
  as: (
    value: unknown,
  ): Result<U64, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not a U64 (tag-content pair with bigint 0n to 18446744073709551615n)",
          }),
        ),
};
/**
 * Exported safe casting function for U64 values.
 */
export const { as: asU64 } = u64Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of U64 values as strings.
 */
export type JsonReadyU64 = Box<"U64", string>;

/**
 * Type guard for JSON-ready U64 values.
 */
export const isJsonReadyU64 = (value: unknown): value is JsonReadyU64 =>
  isBoxWithTag("U64")(value) &&
  typeof value.content === "string" &&
  /^\d+$/.test(value.content);

/**
 * JsonSerializable instance for U64 values.
 */
export const u64JsonSerializable: JsonSerializable<
  U64,
  JsonReadyU64
> = {
  toJsonReady: (value: U64) => ({
    __tag: "U64" as const,
    content: value.content.toString(),
  }),
  fromJsonReady: (jsonReady: JsonReadyU64) => ({
    __tag: "U64" as const,
    content: BigInt(jsonReady.content),
  }),
};
/**
 * Exported JSON serialization functions for U64 values.
 */
export const {
  toJsonReady: toJsonReadyU64,
  fromJsonReady: fromJsonReadyU64,
} = u64JsonSerializable;