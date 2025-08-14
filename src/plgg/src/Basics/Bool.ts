import {
  Result,
  ok,
  err,
  InvalidError,
  Refinement,
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
 * Refinement instance for boolean validation and casting.
 * Provides type-safe boolean validation following the standard Refinement pattern.
 */
export const boolRefinement: Refinement<Bool> = {
  is,
  as: (
    value: unknown,
  ): Result<Bool, InvalidError> =>
    is(value)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not a boolean",
          }),
        ),
};

export const { is: isBool, as: asBool } =
  boolRefinement;
