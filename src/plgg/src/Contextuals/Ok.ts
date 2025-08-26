import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  newErr,
  InvalidError,
  Refinable1,
  Castable1,
  pattern,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1<A> {
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
export type Ok<T> = ParametricVariant<
  typeof okTag,
  T
>;

/**
 * Pattern constructor for matching Ok values in pattern matching.
 */
export const ok = <T>(a?: T) => pattern(okTag)(a);

/**
 * Creates an Ok instance containing a success value.
 */
export const newOk = <T>(a: T): Ok<T> =>
  construct<Ok<T>>(okTag)(a);

/**
 * Type guard to check if a Result is an Ok.
 */
const is = <T>(e: unknown): e is Ok<T> =>
  hasTag(okTag)(e);

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

/**
 * Castable instance for Ok safe casting.
 */
export const okCastable: Castable1<"Ok"> = {
  KindKey: okTag,
  as: <A>(
    value: unknown,
  ): Result<Ok<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not an Ok",
          }),
        ),
};
/**
 * Exported safe casting function for Ok values.
 */
export const { as: asOk } = okCastable;
