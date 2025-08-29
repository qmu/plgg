import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable0,
  Castable0,
  JsonSerializer,
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

export type JsonReadyBool = Bool;

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
export const boolRefinable: Refinable0<Bool> = {
  is,
};
/**
 * Exported type guard function for boolean values.
 */
export const { is: isBool } = boolRefinable;

/**
 * Castable instance for boolean safe casting.
 */
export const boolCastable: Castable0<Bool> = {
  as: (
    value: unknown,
  ): Result<Bool, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a boolean",
          }),
        ),
};
/**
 * Exported safe casting function for boolean values.
 */
export const { as: asBool } = boolCastable;

/**
 * JsonSerializable instance for boolean values.
 */
export const boolJsonSerializable: JsonSerializer<Bool> =
  {
    toJsonReady: (value: Bool) => value,
    fromJsonReady: (jsonReady: Bool) => jsonReady,
  };
export const {
  toJsonReady: toJsonReadyBool,
  fromJsonReady: fromJsonReadyBool,
} = boolJsonSerializable;
