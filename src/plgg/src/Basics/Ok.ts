import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  err,
  InvalidError,
  Refinement1,
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
 * Refinement instance for Ok validation and casting.
 * Provides type-safe Ok validation following the standard Refinement1 pattern.
 */
export const okRefinement: Refinement1<"Ok"> = {
  KindKey: "Ok",
  is,
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
export const { is: isOk, as: asOk } =
  okRefinement;
