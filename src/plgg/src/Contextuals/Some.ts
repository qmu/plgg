import {
  Variant,
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
  export interface MapKind1<A> {
    Some: Some<A>;
  }
}

/**
 * Tag which represents the Some variant of Option.
 */
const someTag = "Some" as const;

/**
 * Some side of Option, representing a value that exists.
 * Contains the actual value in the body property.
 */
export type Some<T> = Variant<typeof someTag, T>;

/**
 * Pattern constructor for Some matching.
 * Used in pattern matching to match Some values.
 */
export const some = <T>(a?: T) =>
  pattern(someTag)(a);

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
 * Exported type guard function for Some values.
 */
export const { is: isSome } = someRefinable;

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
/**
 * Exported safe casting function for Some values.
 */
export const { as: asSome } = someCastable;
