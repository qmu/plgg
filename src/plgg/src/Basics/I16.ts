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
 * A variant with both a tag and content that must be a 16-bit signed integer (-32768 to 32767).
 */
export type I16 = Box<"I16", number>;

/**
 * Type guard to check if a value is an I16.
 */
const is = (value: unknown): value is I16 =>
  isBoxWithTag("I16")(value) &&
  isInt(value.content) &&
  value.content >= -32768 &&
  value.content <= 32767;

/**
 * Refinable instance for I16 type guards.
 */
export const i16Refinable: Refinable<I16> = {
  is,
};
/**
 * Exported type guard function for I16 values.
 */
export const { is: isI16 } = i16Refinable;

/**
 * Castable instance for I16 safe casting.
 */
export const i16Castable: Castable<I16> = {
  as: (
    value: unknown,
  ): Result<I16, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not an I16 (tag-content pair with integer -32768 to 32767)",
          }),
        ),
};
/**
 * Exported safe casting function for I16 values.
 */
export const { as: asI16 } = i16Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of I16 values.
 */
export type JsonReadyI16 = I16;

/**
 * Type guard for JSON-ready I16 values.
 */
export const isJsonReadyI16 = isI16;

/**
 * JsonSerializable instance for I16 values.
 */
export const i16JsonSerializable: JsonSerializable<
  I16,
  JsonReadyI16
> = {
  toJsonReady: (value: I16) => value,
  fromJsonReady: (jsonReady: I16) => jsonReady,
};
/**
 * Exported JSON serialization functions for I16 values.
 */
export const {
  toJsonReady: toJsonReadyI16,
  fromJsonReady: fromJsonReadyI16,
} = i16JsonSerializable;

