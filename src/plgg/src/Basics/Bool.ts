import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable0,
  Castable0,
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
 * Boolean primitive type.
 */
export type Bool = typeof TRUE | typeof FALSE;

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
export const { as: asBool } = boolCastable;
