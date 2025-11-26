import {
  Box,
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  isBox,
  hasTag,
  ok,
  pattern,
  newBox,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Err: Err<A>;
  }
}

/**
 * Tag representing the Err variant of Result.
 */
const errTag = "Err" as const;

/**
 * Represents a failed computation containing an error value.
 */
export type Err<F> = Box<typeof errTag, F> & {
  /**
   * Type guard method to check if this Result is an Ok.
   * Always returns false for Err instances.
   */
  isOk(): false;
  /**
   * Type guard method to check if this Result is an Err.
   * Always returns true for Err instances.
   */
  isErr(): this is Err<F>;
};

/**
 * Pattern constructor for matching Err values in pattern matching.
 */
export const err$ = <T>(v?: T) =>
  pattern(errTag)(v);

/**
 * Creates an Err instance containing an error value.
 */
export const err = <F>(e: F): Err<F> => ({
  ...newBox(errTag)(e),
  isOk(): false {
    return false;
  },
  isErr(): this is Err<F> {
    return true;
  },
});

/**
 * Type guard to check if a Result is an Err.
 */
const is = <F>(e: unknown): e is Err<F> =>
  isBox(e) && hasTag(errTag)(e);

/**
 * Refinable instance for Err type guards.
 */
export const errRefinable: Refinable1<"Err"> = {
  KindKey: errTag,
  is,
};
/**
 * Exported type guard function for Err values.
 */
export const { is: isErr } = errRefinable;

export const asErr = <A>(
  value: unknown,
): Result<Err<A>, InvalidError> =>
  is<A>(value)
    ? ok(value)
    : err(
        new InvalidError({
          message: "Value is not an Err",
        }),
      );

/**
 * Castable instance for Err safe casting.
 */
export const errCastable: Castable1<"Err"> = {
  KindKey: errTag,
  as: asErr,
};
