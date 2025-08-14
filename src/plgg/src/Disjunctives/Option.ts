import {
  Monad1,
  Functor1,
  Apply1,
  Pointed1,
  Applicative1,
  Chain1,
  FixedVariant,
  ParametricVariant,
  hasTag,
  variantMaker,
} from "plgg/index";

const someTag = "Some" as const;
const noneTag = "None" as const;

/**
 * Some side of Option, representing a value that exists.
 * Contains the actual value in the content property.
 */
export type Some<T> = ParametricVariant<typeof someTag, T>;

/**
 * None side of Option, representing the absence of a value.
 * Equivalent to null/undefined but in a type-safe way.
 */
export type None = FixedVariant<typeof noneTag>;

/**
 * Option type for type-safe null handling.
 * Represents a value that may or may not exist.
 */
export type Option<T> = Some<T> | None;

/**
 * Creates a Some instance containing a value.
 */
export const some = <T>(value: T): Some<T> =>
  variantMaker(someTag)<Some<T>>()(value);

/**
 * Creates a None instance representing no value.
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
 * Type guard to check if a value is an Option (either Some or None).
 */
export const isOption = <T>(e: unknown): e is Option<T> =>
  isSome(e) || isNone(e);

declare module "plgg/Abstracts/Standards/Kind" {
  export interface KindKeytoKind1<A> {
    Option: Option<A>;
  }
}

// ==== TYPE CLASS INSTANCES ====

/**
 * Functor instance for Option.
 * Maps functions over optional values.
 */
export const optionFunctor: Functor1<"Option"> = {
  KindKey: "Option",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? some<B>(f(fa.content)) : none(),
};

export const { map: mapOption } = optionFunctor;

// ------------------------------------

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
          ? some<B>(fab.content(fa.content))
          : none()
        : none(),
};

export const { ap: applyOption } = optionApply;

// ------------------------------------

/**
 * Pointed instance for Option.
 * Wraps values in Some context.
 */
export const optionPointed: Pointed1<"Option"> = {
  ...optionFunctor,
  of: <A>(a: A): Option<A> => some<A>(a),
};

export const { of: ofOption } = optionPointed;

// ------------------------------------

/**
 * Applicative instance for Option.
 * Combines Apply and Pointed to provide both function application and value lifting.
 * Enables working with functions and values wrapped in Option contexts.
 */
export const optionApplicative: Applicative1<"Option"> = {
  ...optionApply,
  ...optionFunctor,
  ...optionPointed,
};

// ------------------------------------

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
      isSome(fa) ? f(fa.content) : none(),
};

export const { chain: chainOption } = optionChain;

// ------------------------------------

/**
 * Monad instance for Option.
 * Combines Applicative and Chain to provide full monadic interface.
 */
export const optionMonad: Monad1<"Option"> = {
  ...optionApplicative,
  ...optionChain,
};
