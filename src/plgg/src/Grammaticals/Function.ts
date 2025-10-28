import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable,
  Castable,
} from "plgg/index";

/**
 * Represents JavaScript function values with flexible signature.
 */
export type Func = (...args: any[]) => any;

/**
 * Type guard to check if a value is a Function.
 */
const is = (value: unknown): value is Func =>
  typeof value === "function";

/**
 * Refinable instance for function type guards.
 */
export const funcRefinable: Refinable<Func> = {
  is,
};
/**
 * Exported type guard function for function values.
 */
export const { is: isFunc } = funcRefinable;

/**
 * Castable instance for function safe casting.
 */
export const funcCastable: Castable<Func> = {
  as: (
    value: unknown,
  ): Result<Func, InvalidError> =>
    is(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a function",
          }),
        ),
};
/**
 * Exported safe casting function for function values.
 */
export const { as: asFunc } = funcCastable;
