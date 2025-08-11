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
  Foldable1,
  Traversable1,
  KindKeys1,
  Kind1,
} from "plgg/index";

declare module "plgg/Abstracts/Theoreticals/Kind" {
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
export const { is: isArr, as: asArr } = arrRefinement;

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
export const { map: mapArr } = arrFunctor;

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

export const { ap: applyArr } = arrApply;

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

export const { of: ofArr } = arrPointed;

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
export const { chain: chainArr } = arrChain;

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
 * Foldable instance for Arr.
 * Provides the ability to fold/reduce arrays to single values with both
 * left-associative and right-associative operations.
 *
 * @example
 * const sum = (a: number, b: number) => a + b;
 * foldrArr(sum)(0)([1, 2, 3]); // 6
 * foldlArr((acc: number, x: number) => acc + x)(0)([1, 2, 3]); // 6
 */
export const arrFoldable: Foldable1<"Arr"> = {
  KindKey: "Arr",
  foldr:
    <A, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Arr<A>): B =>
      fa.reduceRight((acc, x) => f(x, acc), initial),
  foldl:
    <A, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Arr<A>): B =>
      fa.reduce(f, initial),
};

export const { foldr: foldrArr, foldl: foldlArr } = arrFoldable;

// ------------------------------------

/**
 * Traversable instance for Arr.
 * Extends both Functor and Foldable to provide structure-preserving traversal
 * that allows applying effects while maintaining the array structure.
 *
 * @example
 * import { resultApplicative, ok } from "plgg/index";
 * const parseNumber = (s: string) => 
 *   isNaN(Number(s)) ? err(new Error("Not a number")) : ok(Number(s));
 * 
 * traverseArr(resultApplicative)(parseNumber)(["1", "2", "3"]); // Ok([1, 2, 3])
 * traverseArr(resultApplicative)(parseNumber)(["1", "x", "3"]); // Err(Error)
 */
export const arrTraversable: Traversable1<"Arr"> = {
  ...arrFunctor,
  ...arrFoldable,
  traverse:
    <F extends KindKeys1>(A: Applicative1<F>) =>
    <A, B>(f: (a: A) => Kind1<F, B>) =>
    (ta: Arr<A>): Kind1<F, Arr<B>> =>
      ta.reduceRight(
        (acc: Kind1<F, Arr<B>>, x: A) =>
          A.ap(A.map((b: B) => (bs: Arr<B>) => [b, ...bs])(f(x)))(acc),
        A.of([])
      ),
  sequence:
    <F extends KindKeys1>(A: Applicative1<F>) =>
    <A>(tfa: Arr<Kind1<F, A>>): Kind1<F, Arr<A>> =>
      arrTraversable.traverse(A)((fa: Kind1<F, A>) => fa)(tfa),
};

export const { traverse: traverseArr, sequence: sequenceArr } = arrTraversable;

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
