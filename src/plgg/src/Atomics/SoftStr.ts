import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
} from "plgg/index";

/**
 * Represents JavaScript string values.
 * SoftStr can be empty, unlike Str which requires at least one character.
 */
export type SoftStr = string;

/**
 * Type predicate to determine if a type is SoftStr.
 */
export type IsSoftStr<T> = T extends SoftStr
  ? true
  : false;

/**
 * Type guard to check if a value is a SoftStr.
 */
const is = (value: unknown): value is SoftStr =>
  typeof value === "string";

/**
 * Refinable instance for string type guards.
 */
export const softStrRefinable: Refinable<SoftStr> = {
  is,
};
/**
 * Exported type guard function for string values.
 */
export const { is: isSoftStr } = softStrRefinable;

export const asSoftStr = (
  value: unknown,
): Result<SoftStr, InvalidError> =>
  is(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message: `${value} is not a string`,
        }),
      );

/**
 * Castable instance for string safe casting.
 */
export const softStrCastable: Castable<SoftStr> = {
  as: asSoftStr,
};

/**
 * Concatenates two strings using curried application.
 */
export const concat =
  (adding: SoftStr) =>
  (base: SoftStr): SoftStr =>
    base + adding;

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of SoftStr values.
 */
export type JsonReadySoftStr = SoftStr;

/**
 * Type guard for JSON-ready SoftStr values.
 */
export const isJsonReadySoftStr = isSoftStr;

/**
 * Datum instance for string values.
 */
export const softStrJsonSerializable: JsonSerializable<
  SoftStr,
  JsonReadySoftStr
> = {
  toJsonReady: (value: SoftStr) => value,
  fromJsonReady: (jsonReady: SoftStr) => jsonReady,
};
/**
 * Exported JSON serialization functions for SoftStr values.
 */
export const {
  toJsonReady: toJsonReadySoftStr,
  fromJsonReady: fromJsonReadySoftStr,
} = softStrJsonSerializable;
