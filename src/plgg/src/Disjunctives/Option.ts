import {
  Monad1,
  Functor1,
  Apply1,
  Pointed1,
  Applicative1,
  Chain1,
  newSome,
  isSome,
  Some,
  None,
  newNone,
  isNone,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Option: Option<A>;
  }
}

/**
 * Option type for type-safe null handling.
 * Represents a value that may or may not exist.
 */
export type Option<T> = Some<T> | None;

/**
 * Type guard to check if a value is an Option (either Some or None).
 */
export const isOption = <T>(
  e: unknown,
): e is Option<T> => isSome(e) || isNone(e);

/**
 * Functor instance for Option.
 * Maps functions over optional values.
 */
export const optionFunctor: Functor1<"Option"> = {
  KindKey: "Option",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa)
        ? newSome<B>(f(fa.content))
        : newNone(),
};
export const { map: mapOption } = optionFunctor;

/**
 * Apply instance for Option.
 * Applies wrapped functions to wrapped values.
 */
export const optionApply: Apply1<"Option"> = {
  ...optionFunctor,
  ap:
    <A, B>(fab: Option<(a: A) => B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fab)
        ? isSome(fa)
          ? newSome<B>(fab.content(fa.content))
          : newNone()
        : newNone(),
};
export const { ap: applyOption } = optionApply;

/**
 * Pointed instance for Option.
 * Wraps values in Some context.
 */
export const optionPointed: Pointed1<"Option"> = {
  ...optionFunctor,
  of: <A>(a: A): Option<A> => newSome<A>(a),
};
export const { of: ofOption } = optionPointed;

/**
 * Applicative instance for Option.
 */
export const optionApplicative: Applicative1<"Option"> =
  {
    ...optionApply,
    ...optionFunctor,
    ...optionPointed,
  };

/**
 * Chain instance for Option.
 * Chains operations that return Options.
 */
export const optionChain: Chain1<"Option"> = {
  ...optionFunctor,
  ...optionApply,
  ...optionPointed,
  chain:
    <A, B>(f: (a: A) => Option<B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? f(fa.content) : newNone(),
};
export const { chain: chainOption } = optionChain;

/**
 * Monad instance for Option.
 */
export const optionMonad: Monad1<"Option"> = {
  ...optionApplicative,
  ...optionChain,
};
