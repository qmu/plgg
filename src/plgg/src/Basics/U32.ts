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
  isInt,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be a 32-bit unsigned integer (0 to 4294967295).
 */
export type U32 = Box<"U32", number>;

/**
 * Type guard to check if a value is a U32.
 */
const is = (value: unknown): value is U32 =>
  isBoxWithTag("U32")(value) &&
  isInt(value.content) &&
  value.content >= 0 &&
  value.content <= 4294967295;

/**
 * Refinable instance for U32 type guards.
 */
export const u32Refinable: Refinable<U32> = {
  is,
};
/**
 * Exported type guard function for U32 values.
 */
export const { is: isU32 } = u32Refinable;

/**
 * Castable instance for U32 safe casting.
 */
export const u32Castable: Castable<U32> = {
  as: (
    value: unknown,
  ): Result<U32, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not a U32 (tag-content pair with integer 0 to 4294967295)",
          }),
        ),
};
/**
 * Exported safe casting function for U32 values.
 */
export const { as: asU32 } = u32Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of U32 values.
 */
export type JsonReadyU32 = U32;

/**
 * Type guard for JSON-ready U32 values.
 */
export const isJsonReadyU32 = isU32;

/**
 * JsonSerializable instance for U32 values.
 */
export const u32JsonSerializable: JsonSerializable<
  U32,
  JsonReadyU32
> = {
  toJsonReady: (value: U32) => value,
  fromJsonReady: (jsonReady: U32) => jsonReady,
};
/**
 * Exported JSON serialization functions for U32 values.
 */
export const {
  toJsonReady: toJsonReadyU32,
  fromJsonReady: fromJsonReadyU32,
} = u32JsonSerializable;