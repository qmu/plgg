import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  newOk,
  newErr,
  InvalidError,
  Refinable1,
  Castable1,
  pattern,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1<A> {
    Some: Some<A>;
  }
}

/**
 * Tag which represents the Some variant of Option.
 */
const someTag = "Some" as const;

/**
 * Some side of Option, representing a value that exists.
 * Contains the actual value in the content property.
 */
export type Some<T> = ParametricVariant<
  typeof someTag,
  T
>;

/**
 * Pattern constructor for Some matching.
 * Used in pattern matching to match Some values.
 */
export const some = <T>(a?: T) =>
  pattern<Some<T>>(someTag)(a);

/**
 * Creates a Some instance containing a value.
 */
export const newSome = <T>(value: T): Some<T> =>
  construct<Some<T>>(someTag)(value);

/**
 * Type guard to check if an Option is a Some.
 */
const is = <T>(e: unknown): e is Some<T> =>
  hasTag(someTag)(e);

/**
 * Refinable instance for Some type guards.
 */
export const someRefinable: Refinable1<"Some"> = {
  KindKey: "Some",
  is,
};

/**
 * Castable instance for Some safe casting.
 */
export const someCastable: Castable1<"Some"> = {
  KindKey: "Some",
  as: <A>(
    value: unknown,
  ): Result<Some<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a Some",
          }),
        ),
};

export const { is: isSome } = someRefinable;
export const { as: asSome } = someCastable;
