import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  err,
  InvalidError,
  Refinable1,
  Castable1,
  pattern,
} from "plgg/index";

declare module "plgg/Abstracts/Standards/Kind" {
  export interface KindKeytoKind1<A> {
    Ok: Ok<A>;
  }
}

/**
 * Tag which represents the Ok variant of Result.
 */
const okTag = "Ok" as const;

/**
 * Ok side of Result, representing a successful computation.
 * Contains the success value in the content property.
 */
export type Ok<T> = ParametricVariant<
  typeof okTag,
  T
>;

export const Ok = <T>(a: T) =>
  pattern<Ok<T>>(okTag)(a);

/**
 * Creates an Ok instance containing a success value.
 */
export const ok = <T>(a: T): Ok<T> =>
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
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not an Ok",
          }),
        ),
};
export const { as: asOk } = okCastable;
