import {
  Box,
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  isBox,
  hasTag,
  newErr,
  pattern,
  newBox,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Ok: Ok<A>;
  }
}

/**
 * Tag representing the Ok variant of Result.
 */
const okTag = "Ok" as const;

/**
 * Represents a successful computation containing a success value.
 */
export type Ok<T> = Box<typeof okTag, T> & {
  /**
   * Type guard method to check if this Result is an Ok.
   * Always returns true for Ok instances.
   */
  isOk(): this is Ok<T>;
  /**
   * Type guard method to check if this Result is an Err.
   * Always returns false for Ok instances.
   */
  isErr(): false;
};

/**
 * Pattern constructor for matching Ok values in pattern matching.
 */
export const ok = <T>(a?: T) => pattern(okTag)(a);

/**
 * Creates an Ok instance containing a success value.
 */
export const newOk = <T>(a: T): Ok<T> => ({
  ...newBox(okTag)(a),
  isOk(): this is Ok<T> {
    return true;
  },
  isErr(): false {
    return false;
  },
});

/**
 * Type guard to check if a Result is an Ok.
 */
const is = <T>(e: unknown): e is Ok<T> =>
  isBox(e) && hasTag(okTag)(e);

/**
 * Refinable instance for Ok type guards.
 */
export const okRefinable: Refinable1<"Ok"> = {
  KindKey: okTag,
  is,
};
/**
 * Exported type guard function for Ok values.
 */
export const { is: isOk } = okRefinable;

export const asOk = <A>(
  value: unknown,
): Result<Ok<A>, InvalidError> =>
  is<A>(value)
    ? newOk(value)
    : newErr(
        new InvalidError({
          message: "Value is not an Ok",
        }),
      );

/**
 * Castable instance for Ok safe casting.
 */
export const okCastable: Castable1<"Ok"> = {
  KindKey: okTag,
  as: asOk,
};
