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
 * A variant with both a tag and content that must be a 16-bit unsigned integer (0 to 65535).
 */
export type U16 = Box<"U16", number>;

/**
 * Type guard to check if a value is a U16.
 */
const is = (value: unknown): value is U16 =>
  isBoxWithTag("U16")(value) &&
  isInt(value.content) &&
  value.content >= 0 &&
  value.content <= 65535;

/**
 * Refinable instance for U16 type guards.
 */
export const u16Refinable: Refinable<U16> = {
  is,
};
/**
 * Exported type guard function for U16 values.
 */
export const { is: isU16 } = u16Refinable;

/**
 * Castable instance for U16 safe casting.
 */
export const u16Castable: Castable<U16> = {
  as: (
    value: unknown,
  ): Result<U16, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message:
              "Value is not a U16 (tag-content pair with integer 0 to 65535)",
          }),
        ),
};
/**
 * Exported safe casting function for U16 values.
 */
export const { as: asU16 } = u16Castable;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of U16 values.
 */
export type JsonReadyU16 = U16;

/**
 * Type guard for JSON-ready U16 values.
 */
export const isJsonReadyU16 = isU16;

/**
 * JsonSerializable instance for U16 values.
 */
export const u16JsonSerializable: JsonSerializable<
  U16,
  JsonReadyU16
> = {
  toJsonReady: (value: U16) => value,
  fromJsonReady: (jsonReady: U16) => jsonReady,
};
/**
 * Exported JSON serialization functions for U16 values.
 */
export const {
  toJsonReady: toJsonReadyU16,
  fromJsonReady: fromJsonReadyU16,
} = u16JsonSerializable;