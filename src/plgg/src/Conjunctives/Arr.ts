import {
  Result,
  newOk,
  newErr,
  isOk,
  isErr,
  InvalidError,
  Refinable1,
  Castable1,
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

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1<A> {
    Arr: Arr<A>;
  }
}

/**
 * Readonly array type providing immutable functional programming operations.
 */
export type Arr<T extends unknown = unknown> =
  ReadonlyArray<T>;

/**
 * Type guard to check if a value is an Arr.
 */
const is = <T>(value: unknown): value is Arr<T> =>
  Array.isArray(value);

/**
 * Refinable instance for array type guards.
 */
export const arrRefinable: Refinable1<"Arr"> = {
  KindKey: "Arr",
  is,
};
/**
 * Exported type guard function for array values.
 */
export const { is: isArr } = arrRefinable;

/**
 * Castable instance for array safe casting.
 */
export const arrCastable: Castable1<"Arr"> = {
  KindKey: "Arr",
  as: <A>(
    value: unknown,
  ): Result<Arr<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not an array",
          }),
        ),
};
/**
 * Exported safe casting function for array values.
 */
export const { as: asArr } = arrCastable;

/**
 * Functor instance providing mapping operations over array elements.
 */
export const arrFunctor: Functor1<"Arr"> = {
  KindKey: "Arr",
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.map(f),
};
/**
 * Exported mapping function for arrays.
 */
export const { map: mapArr } = arrFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const arrApply: Apply1<"Arr"> = {
  ...arrFunctor,
  ap:
    <T1, T2>(fab: Arr<(a: T1) => T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fab.flatMap((f) => fa.map(f)),
};
/**
 * Exported application function for arrays.
 */
export const { ap: applyArr } = arrApply;

/**
 * Pointed instance enabling wrapping of values in array context.
 */
export const arrPointed: Pointed1<"Arr"> = {
  ...arrFunctor,
  of: <T>(a: T): Arr<T> => [a],
};

/**
 * Exported value wrapping function for arrays.
 */
export const { of: ofArr } = arrPointed;

/**
 * Applicative instance combining Apply and Pointed for arrays.
 */
export const arrApplicative: Applicative1<"Arr"> =
  {
    ...arrApply,
    ...arrFunctor,
    ...arrPointed,
  };

/**
 * Chain instance enabling chaining of operations that return arrays.
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
/**
 * Exported chaining function for arrays.
 */
export const { chain: chainArr } = arrChain;

/**
 * Monad instance providing full monadic interface for arrays.
 */
export const arrMonad: Monad1<"Arr"> = {
  ...arrApplicative,
  ...arrChain,
};

/**
 * Foldable instance providing fold operations for arrays.
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
/**
 * Exported fold functions for arrays.
 */
export const {
  foldr: foldrArr,
  foldl: foldlArr,
} = arrFoldable;

/**
 * Traversable instance providing structure-preserving traversal for arrays.
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
/**
 * Exported traversal functions for arrays.
 */
export const {
  traverse: traverseArr,
  sequence: sequenceArr,
} = arrTraversable;

/**
 * Applies function to each element, collecting all results or errors.
 */
export const conclude =
  <T, U, F>(fn: (item: T) => Result<U, F>) =>
  (arr: Arr<T>): Result<Arr<U>, Arr<F>> =>
    arr
      .map(fn)
      .reduce<
        Result<Arr<U>, Arr<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.body, result.body]) : acc) : isErr(acc) ? newErr([...acc.body, result.body]) : newErr([result.body])), newOk([]));
