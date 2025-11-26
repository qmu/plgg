import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  JsonSerializable,
  ok,
  err,
} from "plgg/index";

/**
 * Boolean true constant for type-safe boolean operations.
 */
export const TRUE = true as const;

/**
 * Boolean false constant for type-safe boolean operations.
 */
export const FALSE = false as const;

/**
 * Represents JavaScript boolean values.
 */
export type Bool = typeof TRUE | typeof FALSE;

/**
 * Type predicate to determine if a type is Bool.
 */
export type IsBool<T> = T extends Bool
  ? true
  : false;

/**
 * Type guard to check if a value is a Bool.
 */
const is = (value: unknown): value is Bool =>
  typeof value === "boolean";

/**
 * Refinable instance for boolean type guards.
 */
export const boolRefinable: Refinable<Bool> = {
  is,
};
/**
 * Exported type guard function for boolean values.
 */
export const { is: isBool } = boolRefinable;

export const asBool = (
  value: unknown,
): Result<Bool, InvalidError> =>
  is(value)
    ? ok(value)
    : err(
        new InvalidError({
          message: "Value is not a boolean",
        }),
      );

/**
 * Castable instance for boolean safe casting.
 */
export const boolCastable: Castable<Bool> = {
  as: asBool,
};

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JSON-ready representation of Bool values.
 */
export type JsonReadyBool = Bool;

/**
 * Type guard for JSON-ready Bool values.
 */
export const isJsonReadyBool = isBool;

/**
 * Datum instance for boolean values.
 */
export const boolJsonSerializable: JsonSerializable<
  Bool,
  JsonReadyBool
> = {
  toJsonReady: (value: Bool) => value,
  fromJsonReady: (jsonReady: Bool) => jsonReady,
};
/**
 * Exported JSON serialization functions for Bool values.
 */
export const {
  toJsonReady: toJsonReadyBool,
  fromJsonReady: fromJsonReadyBool,
} = boolJsonSerializable;
