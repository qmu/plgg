import {
  Result,
  ok,
  err,
  InvalidError,
  invalidError,
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
 * @internal
 */
export const funcRefinable: Refinable<Func> = {
  is,
};
/**
 * Exported type guard function for function values.
 */
export const { is: isFunc } = funcRefinable;

export const asFunc = (
  value: unknown,
): Result<Func, InvalidError> =>
  is(value)
    ? ok(value)
    : err(
        invalidError({
          message: "Value is not a function",
        }),
      );

/**
 * Castable instance for function safe casting.
 * @internal
 */
export const funcCastable: Castable<Func> = {
  as: asFunc,
};
