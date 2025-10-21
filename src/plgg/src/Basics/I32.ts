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
 * A variant with both a tag and content that must be a 32-bit signed integer (-2147483648 to 2147483647).
 */
export type I32 = Box<"I32", number>;

/**
 * Type guard to check if a value is an I32.
 */
const is = (value: unknown): value is I32 =>
  isBoxWithTag("I32")(value) &&
  isInt(value.content) &&
  value.content >= -2147483648 &&
  value.content <= 2147483647;

/**
 * Refinable instance for I32 type guards.
 */
export const i32Refinable: Refinable<I32> = {
  is,
};
/**
 * Exported type guard function for I32 values.
 */
export const { is: isI32 } = i32Refinable;

/**
 * Castable instance for I32 safe casting.
 */
export const i32Castable: Castable<I32> = {
  as: (
    value: unknown,
  ): Result<I32, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not an I32 (tag-content pair with integer -2147483648 to 2147483647)",
          }),
        ),
};
/**
 * Exported safe casting function for I32 values.
 */
export const { as: asI32 } = i32Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of I32 values.
 */
export type JsonReadyI32 = I32;

/**
 * Type guard for JSON-ready I32 values.
 */
export const isJsonReadyI32 = isI32;

/**
 * JsonSerializable instance for I32 values.
 */
export const i32JsonSerializable: JsonSerializable<
  I32,
  JsonReadyI32
> = {
  toJsonReady: (value: I32) => value,
  fromJsonReady: (jsonReady: I32) => jsonReady,
};
/**
 * Exported JSON serialization functions for I32 values.
 */
export const {
  toJsonReady: toJsonReadyI32,
  fromJsonReady: fromJsonReadyI32,
} = i32JsonSerializable;

