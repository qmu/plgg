import {
  ParametricVariant,
  hasTag,
  construct,
  Result,
  ok,
  err,
  InvalidError,
  Refinable1,
  Castable1,
} from "plgg/index";

declare module "plgg/Abstracts/Standards/Kind" {
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
 * Creates a Some instance containing a value.
 */
export const some = <T>(value: T): Some<T> =>
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
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not a Some",
          }),
        ),
};

export const { is: isSome } = someRefinable;
export const { as: asSome } = someCastable;

