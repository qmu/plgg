import {
  Result,
  ok,
  err,
  isOk,
  isErr,
  InvalidError,
  Refinement1,
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

declare module "plgg/Abstracts/Standards/Kind" {
  export interface KindKeytoKind1<A> {
    Arr: Arr<A>;
  }
}

/**
 * Readonly array type for functional programming operations.
 * Provides a type-safe wrapper around JavaScript arrays with immutable operations.
 */
export type Arr<T extends unknown = unknown> =
  ReadonlyArray<T>;

/**
 * Type guard to check if a value is an Arr.
 */
const is = <T>(value: unknown): value is Arr<T> =>
  Array.isArray(value);

/**
 * Refinement instance for array validation and casting.
 * Provides type-safe array validation following the standard Refinement1 pattern.
 */
export const arrRefinement: Refinement1<"Arr"> = {
  KindKey: "Arr",
  is,
  as: <A>(
    value: unknown,
  ): Result<Arr<A>, InvalidError> =>
    is<A>(value)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Value is not an array",
          }),
        ),
};
export const { is: isArr, as: asArr } =
  arrRefinement;

/**
 * Functor instance for Arr.
 * Provides the ability to map functions over array elements while preserving structure.
 */
export const arrFunctor: Functor1<"Arr"> = {
  KindKey: "Arr",
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.map(f),
};
export const { map: mapArr } = arrFunctor;

/**
 * Apply instance for Arr.
 * Extends Functor with the ability to apply wrapped functions to wrapped values.
 */
export const arrApply: Apply1<"Arr"> = {
  ...arrFunctor,
  ap:
    <T1, T2>(fab: Arr<(a: T1) => T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fab.flatMap((f) => fa.map(f)),
};
export const { ap: applyArr } = arrApply;

/**
 * Pointed instance for Arr.
 * Provides the ability to wrap a single value in an array context.
 */
export const arrPointed: Pointed1<"Arr"> = {
  ...arrFunctor,
  of: <T>(a: T): Arr<T> => [a],
};

export const { of: ofArr } = arrPointed;

/**
 * Applicative instance for Arr.
 * Combines Apply and Pointed to provide both function application and value lifting.
 * Enables working with functions and values wrapped in array contexts.
 */
export const arrApplicative: Applicative1<"Arr"> =
  {
    ...arrApply,
    ...arrFunctor,
    ...arrPointed,
  };

/**
 * Chain instance for Arr.
 * Extends Apply with the ability to chain operations that return arrays.
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

/**
 * Monad instance for Arr.
 * Combines Applicative and Chain to provide the full monadic interface.
 */
export const arrMonad: Monad1<"Arr"> = {
  ...arrApplicative,
  ...arrChain,
};

/**
 * Foldable instance for Arr.
 * Provides fold/reduce operations for arrays with left and right associativity.
 */
export const arrFoldable: Foldable1<"Arr"> = {
  KindKey: "Arr",
  foldr:
    <A, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Arr<A>): B =>
      fa.reduceRight(
        (acc, x) => f(x, acc),
        initial,
      ),
  foldl:
    <A, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Arr<A>): B =>
      fa.reduce(f, initial),
};
export const {
  foldr: foldrArr,
  foldl: foldlArr,
} = arrFoldable;

/**
 * Traversable instance for Arr.
 * Extends Functor and Foldable to provide structure-preserving traversal.
 */
export const arrTraversable: Traversable1<"Arr"> =
  {
    ...arrFunctor,
    ...arrFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B>(f: (a: A) => Kind1<F, B>) =>
      (ta: Arr<A>): Kind1<F, Arr<B>> =>
        ta.reduceRight(
          (acc: Kind1<F, Arr<B>>, x: A) =>
            A.ap(
              A.map((b: B) => (bs: Arr<B>) => [
                b,
                ...bs,
              ])(f(x)),
            )(acc),
          A.of([]),
        ),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: Arr<Kind1<F, A>>,
      ): Kind1<F, Arr<A>> =>
        arrTraversable.traverse(A)(
          (fa: Kind1<F, A>) => fa,
        )(tfa),
  };
export const {
  traverse: traverseArr,
  sequence: sequenceArr,
} = arrTraversable;

/**
 * Applies function to each array element, collecting results.
 * Returns all successful results or all errors encountered.
 */
export const conclude =
  <T, U, F>(fn: (item: T) => Result<U, F>) =>
  (arr: Arr<T>): Result<Arr<U>, Arr<F>> =>
    arr
      .map(fn)
      .reduce<
        Result<Arr<U>, Arr<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? ok([...acc.content, result.content]) : acc) : isErr(acc) ? err([...acc.content, result.content]) : err([result.content])), ok([]));
