import {
  Variant,
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
export type Err<F> = Variant<typeof errTag, F>;

/**
 * Pattern constructor for matching Err values in pattern matching.
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
/**
 * Exported type guard function for Err values.
 */
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
/**
 * Exported safe casting function for Err values.
 */
export const { as: asErr } = errCastable;
