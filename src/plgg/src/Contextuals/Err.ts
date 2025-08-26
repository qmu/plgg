import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  newOk,
  InvalidError,
  Refinable1,
  Castable1,
  pattern,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
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
 * Contains the error value in the body property.
 */
export type Err<F> = ParametricVariant<
  typeof errTag,
  F
>;

/**
 * Pattern constructor for Err matching.
 * Used in pattern matching to match Err values.
 */
export const err = <T>(v?: T) =>
  pattern(errTag)(v);

/**
 * Creates an Err instance containing an error value.
 */
export const newErr = <F>(e: F): Err<F> =>
  construct<Err<F>>(errTag)(e);

/**
 * Type guard to check if a Result is an Err.
 */
const is = <F>(e: unknown): e is Err<F> =>
  hasTag(errTag)(e);

/**
 * Refinable instance for Err type guards.
 */
export const errRefinable: Refinable1<"Err"> = {
  KindKey: errTag,
  is,
};
export const { is: isErr } = errRefinable;

/**
 * Castable instance for Err safe casting.
 */
export const errCastable: Castable1<"Err"> = {
  KindKey: errTag,
  as: <A>(
    value: unknown,
  ): Result<Err<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not an Err",
          }),
        ),
};
export const { as: asErr } = errCastable;
