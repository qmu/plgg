import {
  Monad1,
  FixedVariant,
  ParametricVariant,
  hasTag,
  variantMaker,
} from "plgg/index";

const someTag = "Some" as const;
const noneTag = "None" as const;

/**
 * Some side of Option, representing a value that exists.
 */
export type Some<T> = ParametricVariant<typeof someTag, T>;

/**
 * None side of Option, representing no value.
 */
export type None = FixedVariant<typeof noneTag>;

/**
 * Option type for handling optional values.
 */
export type Option<T> = Some<T> | None;

/**
 * Creates a Some instance.
 */
export const some = <T>(value: T): Some<T> =>
  variantMaker(someTag)<Some<T>>()(value);

/**
 * Creates a None instance.
 */
export const none = (): None => variantMaker(noneTag)<None>()();

/**
 * Type guard to check if an Option is a Some.
 */
export const isSome = <T>(e: unknown): e is Some<T> => hasTag(someTag)(e);

/**
 * Type guard to check if an Option is a None.
 */
export const isNone = (e: unknown): e is None => hasTag(noneTag)(e);

/**
 * Type guard to check if a value is an Option.
 */
export const isOption = <T>(e: unknown): e is Option<T> =>
  isSome(e) || isNone(e);

// --------------------------------------

declare module "plgg/TypeLevels/Kind" {
  export interface KindKeytoKind1<A> {
    Option: Option<A>;
  }
}

/**
 * Monad instance for Option providing map, ap, of, and chain operations.
 * Exported as individual functions for convenient use.
 */
export const {
  /** Maps a function over the content of an Option */
  map: mapOption,
  /** Applies a wrapped function to a wrapped value */
  ap: applyOption,
  /** Wraps a value in a Some */
  of: ofOption,
  /** Monadic bind operation for Option */
  chain: chainOption,
}: Monad1<"Option"> = {
  KindKey: "Option",

  // Functor1: map
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? some<B>(f(fa.content)) : none(),

  // Apply1: ap
  ap:
    <A, B>(fab: Option<(a: A) => B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fab)
        ? isSome(fa)
          ? some<B>(fab.content(fa.content))
          : none()
        : none(),

  // Pointed1: of
  of: <A>(a: A): Option<A> => some<A>(a),

  // Chain1: chain
  chain:
    <A, B>(f: (a: A) => Option<B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? f(fa.content) : none(),
};
