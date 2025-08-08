import {
  Result,
  ok,
  err,
  InvalidError,
  Refinement,
  Monad1,
  Functor1,
  Apply1,
  Pointed1,
  Applicative1,
  Chain1,
} from "plgg/index";

declare module "plgg/Abstracts/Theoriticals/Kind" {
  export interface KindKeytoKind1<A> {
    Arr: Arr<A>;
  }
}

/**
 * Readonly array type for functional programming operations.
 * Provides a type-safe wrapper around JavaScript arrays with immutable operations.
 *
 * @template T - Type of array elements (defaults to unknown)
 * @example
 * const numbers: Arr<number> = [1, 2, 3];
 * const strings: Arr<string> = ['a', 'b', 'c'];
 */
export type Arr<T extends unknown = unknown> = ReadonlyArray<T>;

// ==== TYPE CLASS INSTANCES ====

/**
 * Refinement instance for array validation and casting.
 * Provides type-safe array validation following the standard Refinement pattern.
 */
export const arrRefinement: Refinement<Arr> = {
  is: (value: unknown): value is Arr => Array.isArray(value),
  as: (value: unknown): Result<Arr, InvalidError> =>
    Array.isArray(value)
      ? ok(value)
      : err(new InvalidError({ message: "Value is not an array" })),
};

export const {
  /**
   * Type guard for ReadonlyArray<unknown>.
   * Extracted from arrRefinement for backward compatibility.
   */
  is: isArr,

  /**
   * Validates and casts unknown value to array.
   * Extracted from arrRefinement for backward compatibility.
   */
  as: asArr,
} = arrRefinement;

// ------------------------------------

/**
 * Functor instance for Arr.
 * Provides the ability to map functions over array elements while preserving structure.
 *
 * @example
 * const double = (x: number) => x * 2;
 * mapArr(double)([1, 2, 3]); // [2, 4, 6]
 */
export const arrFunctor: Functor1<"Arr"> = {
  KindKey: "Arr",
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.map(f),
};

export const {
  /** Maps a function over each element of an array */
  map: mapArr,
} = arrFunctor;

// ------------------------------------

/**
 * Apply instance for Arr.
 * Extends Functor with the ability to apply wrapped functions to wrapped values.
 * Creates cartesian product by applying each function to each value.
 *
 * @example
 * const fns = [(x: number) => x * 2, (x: number) => x + 1];
 * const values = [1, 2];
 * applyArr(fns)(values); // [2, 4, 2, 3]
 */
export const arrApply: Apply1<"Arr"> = {
  ...arrFunctor,
  ap:
    <T1, T2>(fab: Arr<(a: T1) => T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fab.flatMap((f) => fa.map(f)),
};

export const {
  /** Applies an array of functions to an array of values */
  ap: applyArr,
} = arrApply;

// ------------------------------------

/**
 * Pointed instance for Arr.
 * Provides the ability to wrap a single value in an array context.
 *
 * @example
 * ofArr(42); // [42]
 * ofArr('hello'); // ['hello']
 */
export const arrPointed: Pointed1<"Arr"> = {
  ...arrFunctor,
  of: <T>(a: T): Arr<T> => [a],
};

export const {
  /** Wraps a value in an array */
  of: ofArr,
} = arrPointed;

// ------------------------------------

/**
 * Applicative instance for Arr.
 * Combines Apply and Pointed to provide both function application and value lifting.
 * Enables working with functions and values wrapped in array contexts.
 */
export const arrApplicative: Applicative1<"Arr"> = {
  ...arrApply,
  ...arrFunctor,
  ...arrPointed,
};

// ------------------------------------

/**
 * Chain instance for Arr.
 * Extends Apply with the ability to chain operations that return arrays,
 * automatically flattening nested arrays to prevent Arr<Arr<T>>.
 *
 * @example
 * const duplicate = (x: number) => [x, x];
 * chainArr(duplicate)([1, 2]); // [1, 1, 2, 2]
 */
export const arrChain: Chain1<"Arr"> = {
  ...arrFunctor,
  ...arrApply,
  ...arrPointed,
  chain:
    <T1, T2>(f: (a: T1) => Arr<T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.flatMap(f),
};
export const {
  /** Chains operations that return arrays */
  chain: chainArr,
} = arrChain;

// ------------------------------------

/**
 * Monad instance for Arr.
 * Combines Applicative and Chain to provide the full monadic interface.
 * Satisfies monad laws and enables powerful composition patterns.
 *
 * Available operations:
 * - map: Transform elements
 * - ap: Apply functions to values
 * - of: Lift values into arrays
 * - chain: Flatten nested operations
 */
export const arrMonad: Monad1<"Arr"> = {
  ...arrApplicative,
  ...arrChain,
};

// ------------------------------------

/**
 * Validates that all array elements match a type predicate.
 * Returns a typed array if all elements pass the predicate.
 *
 * @param predicate - Type guard function to validate each element
 * @returns Function that validates arrays using the predicate
 * @example
 * const validateNumbers = every(isNum);
 * const result = validateNumbers([1, 2, 3]); // Ok([1, 2, 3])
 * const invalid = validateNumbers([1, "2", 3]); // Err(InvalidError)
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: Arr): Result<Arr<T>, InvalidError> =>
    value.every(predicate)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Array elements do not match predicate",
          }),
        );
