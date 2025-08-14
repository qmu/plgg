import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  ok,
  InvalidError,
  Refinement1,
} from "plgg/index";

declare module "plgg/Abstracts/Standards/Kind" {
  export interface KindKeytoKind1<A> {
    Err: Err<A>;
  }
}

/**
 * Tag which represents the Err variant of Result.
 */
const errTag = "Err" as const;

/**
 * Err side of Result, representing a failed computation.
 * Contains the error value in the content property.
 */
export type Err<F> = ParametricVariant<
  typeof errTag,
  F
>;

/**
 * Creates an Err instance containing an error value.
 */
export const err = <F>(e: F): Err<F> =>
  construct<Err<F>>(errTag)(e);

/**
 * Type guard to check if a Result is an Err.
 */
const is = <F>(e: unknown): e is Err<F> =>
  hasTag(errTag)(e);

/**
 * Refinement instance for Err validation and casting.
 * Provides type-safe Err validation following the standard Refinement1 pattern.
 */
export const errRefinement: Refinement1<"Err"> = {
  KindKey: "Err",
  is,
  as: <A>(
    value: unknown,
  ): Result<Err<A>, InvalidError> =>
    is<A>(value)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not an Err",
          }),
        ),
};
export const { is: isErr, as: asErr } =
  errRefinement;

