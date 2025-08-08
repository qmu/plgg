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
 *
 * @template T - Type of the contained value
 */
export type Some<T> = ParametricVariant<typeof someTag, T>;

/**
 * None side of Option, representing the absence of a value.
 * Equivalent to null/undefined but in a type-safe way.
 */
export type None = FixedVariant<typeof noneTag>;

/**
 * Option type for type-safe null handling.
 * Represents a value that may or may not exist, eliminating null/undefined errors.
 * Provides a functional alternative to nullable types.
 *
 * @template T - Type of the optional value
 * @example
 * const getName = (user: { name?: string }): Option<string> =>
 *   user.name ? some(user.name) : none();
 * 
 * const greeting = getName({ name: "Alice" }); // Some("Alice")
 * const noGreeting = getName({}); // None
 */
export type Option<T> = Some<T> | None;

/**
 * Creates a Some instance containing a value.
 *
 * @param value - The value to wrap
 * @returns Some variant containing the value
 * @example
 * const value = some(42); // Some<number>
 */
export const some = <T>(value: T): Some<T> =>
  variantMaker(someTag)<Some<T>>()(value);

/**
 * Creates a None instance representing no value.
 *
 * @returns None variant
 * @example
 * const empty = none(); // None
 */
export const none = (): None => variantMaker(noneTag)<None>()();

/**
 * Type guard to check if an Option is a Some.
 *
 * @param e - Value to check
 * @returns True if the value is Some, false otherwise
 * @example
 * if (isSome(option)) {
 *   console.log(option.content); // TypeScript knows this exists
 * }
 */
export const isSome = <T>(e: unknown): e is Some<T> => hasTag(someTag)(e);

/**
 * Type guard to check if an Option is a None.
 *
 * @param e - Value to check
 * @returns True if the value is None, false otherwise
 * @example
 * if (isNone(option)) {
 *   console.log("No value present");
 * }
 */
export const isNone = (e: unknown): e is None => hasTag(noneTag)(e);

/**
 * Type guard to check if a value is an Option (either Some or None).
 *
 * @param e - Value to check
 * @returns True if the value is an Option, false otherwise
 * @example
 * if (isOption(value)) {
 *   // TypeScript knows value is Option<T>
 * }
 */
export const isOption = <T>(e: unknown): e is Option<T> =>
  isSome(e) || isNone(e);

declare module "plgg/Theoriticals/Kind" {
  export interface KindKeytoKind1<A> {
    Option: Option<A>;
  }
}

// ==== TYPE CLASS INSTANCES ====

/**
 * Functor instance for Option.
 * Provides the ability to map functions over optional values.
 * Functions are only applied to Some values, None values remain None.
 *
 * @example
 * const double = (x: number) => x * 2;
 * mapOption(double)(some(21)); // Some(42)
 * mapOption(double)(none()); // None
 */
export const optionFunctor: Functor1<"Option"> = {
  KindKey: "Option",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? some<B>(f(fa.content)) : none(),
};

export const {
  /** Maps a function over the content of an Option */
  map: mapOption,
} = optionFunctor;

// ------------------------------------

/**
 * Apply instance for Option.
 * Extends Functor with the ability to apply wrapped functions to wrapped values.
 * Both function and value must be Some for application to succeed.
 *
 * @example
 * const addFn = some((x: number) => x + 1);
 * const value = some(41);
 * applyOption(addFn)(value); // Some(42)
 * applyOption(none())(value); // None
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

export const {
  /** Applies a wrapped function to a wrapped value */
  ap: applyOption,
} = optionApply;

// ------------------------------------

/**
 * Pointed instance for Option.
 * Provides the ability to wrap a value in a Some context.
 *
 * @example
 * ofOption(42); // Some(42)
 * ofOption("hello"); // Some("hello")
 */
export const optionPointed: Pointed1<"Option"> = {
  ...optionFunctor,
  of: <A>(a: A): Option<A> => some<A>(a),
};

export const {
  /** Wraps a value in a Some */
  of: ofOption,
} = optionPointed;

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
 * Extends Apply with the ability to chain operations that return Options.
 * Enables sequential computations that can fail by returning None.
 *
 * @example
 * const safeDivide = (x: number) => (y: number) => 
 *   y === 0 ? none() : some(x / y);
 * chainOption(safeDivide(10))(some(2)); // Some(5)
 * chainOption(safeDivide(10))(none()); // None
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

export const {
  /** Monadic bind operation for Option */
  chain: chainOption,
} = optionChain;

// ------------------------------------

/**
 * Monad instance for Option.
 * Combines Applicative and Chain to provide the full monadic interface.
 * Satisfies monad laws and enables powerful optional value composition patterns.
 *
 * Available operations:
 * - map: Transform optional values
 * - ap: Apply functions to values  
 * - of: Lift values into Options
 * - chain: Chain optional operations
 */
export const optionMonad: Monad1<"Option"> = {
  ...optionApplicative,
  ...optionChain,
};
