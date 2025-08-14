import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  ok,
  InvalidError,
  Refinable1,
  Castable1,
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
 * Refinable instance for Err type guards.
 */
export const errRefinable: Refinable1<"Err"> = {
  KindKey: "Err",
  is,
};
export const { is: isErr } = errRefinable;

/**
 * Castable instance for Err safe casting.
 */
export const errCastable: Castable1<"Err"> = {
  KindKey: "Err",
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
export const { as: asErr } = errCastable;
