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
    Vec: Vec<A>;
  }
}

/**
 * Readonly vector type providing immutable functional programming operations.
 */
export type Vec<T extends unknown = unknown> =
  ReadonlyArray<T>;

/**
 * Type guard to check if a value is a Vec.
 */
const is = <T>(value: unknown): value is Vec<T> =>
  Array.isArray(value);

/**
 * Refinable instance for vector type guards.
 */
export const vecRefinable: Refinable1<"Vec"> = {
  KindKey: "Vec",
  is,
};
/**
 * Exported type guard function for vector values.
 */
export const { is: isVec } = vecRefinable;

/**
 * Castable instance for vector safe casting.
 */
export const vecCastable: Castable1<"Vec"> = {
  KindKey: "Vec",
  as: <A>(
    value: unknown,
  ): Result<Vec<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Value is not a vector",
          }),
        ),
};
/**
 * Exported safe casting function for vector values.
 */
export const { as: asVec } = vecCastable;

/**
 * Functor instance providing mapping operations over vector elements.
 */
export const vecFunctor: Functor1<"Vec"> = {
  KindKey: "Vec",
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: Vec<T1>): Vec<T2> =>
      fa.map(f),
};
/**
 * Exported mapping function for vectors.
 */
export const { map: mapVec } = vecFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const vecApply: Apply1<"Vec"> = {
  ...vecFunctor,
  ap:
    <T1, T2>(fab: Vec<(a: T1) => T2>) =>
    (fa: Vec<T1>): Vec<T2> =>
      fab.flatMap((f) => fa.map(f)),
};
/**
 * Exported application function for vectors.
 */
export const { ap: applyVec } = vecApply;

/**
 * Pointed instance enabling wrapping of values in vector context.
 */
export const vecPointed: Pointed1<"Vec"> = {
  ...vecFunctor,
  of: <T>(a: T): Vec<T> => [a],
};

/**
 * Exported value wrapping function for vectors.
 */
export const { of: ofVec } = vecPointed;

/**
 * Applicative instance combining Apply and Pointed for vectors.
 */
export const vecApplicative: Applicative1<"Vec"> =
  {
    ...vecApply,
    ...vecFunctor,
    ...vecPointed,
  };

/**
 * Chain instance enabling chaining of operations that return vectors.
 */
export const vecChain: Chain1<"Vec"> = {
  ...vecFunctor,
  ...vecApply,
  ...vecPointed,
  chain:
    <T1, T2>(f: (a: T1) => Vec<T2>) =>
    (fa: Vec<T1>): Vec<T2> =>
      fa.flatMap(f),
};
/**
 * Exported chaining function for vectors.
 */
export const { chain: chainVec } = vecChain;

/**
 * Monad instance providing full monadic interface for vectors.
 */
export const vecMonad: Monad1<"Vec"> = {
  ...vecApplicative,
  ...vecChain,
};

/**
 * Foldable instance providing fold operations for vectors.
 */
export const vecFoldable: Foldable1<"Vec"> = {
  KindKey: "Vec",
  foldr:
    <A, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Vec<A>): B =>
      fa.reduceRight(
        (acc, x) => f(x, acc),
        initial,
      ),
  foldl:
    <A, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Vec<A>): B =>
      fa.reduce(f, initial),
};
/**
 * Exported fold functions for vectors.
 */
export const {
  foldr: foldrVec,
  foldl: foldlVec,
} = vecFoldable;

/**
 * Traversable instance providing structure-preserving traversal for vectors.
 */
export const vecTraversable: Traversable1<"Vec"> =
  {
    ...vecFunctor,
    ...vecFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B>(f: (a: A) => Kind1<F, B>) =>
      (ta: Vec<A>): Kind1<F, Vec<B>> =>
        ta.reduceRight(
          (acc: Kind1<F, Vec<B>>, x: A) =>
            A.ap(
              A.map((b: B) => (bs: Vec<B>) => [
                b,
                ...bs,
              ])(f(x)),
            )(acc),
          A.of([]),
        ),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: Vec<Kind1<F, A>>,
      ): Kind1<F, Vec<A>> =>
        vecTraversable.traverse(A)(
          (fa: Kind1<F, A>) => fa,
        )(tfa),
  };
/**
 * Exported traversal functions for vectors.
 */
export const {
  traverse: traverseVec,
  sequence: sequenceVec,
} = vecTraversable;

/**
 * Applies function to each element, collecting all results or errors.
 */
export const conclude =
  <T, U, F>(fn: (item: T) => Result<U, F>) =>
  (vec: Vec<T>): Result<Vec<U>, Vec<F>> =>
    vec
      .map(fn)
      .reduce<
        Result<Vec<U>, Vec<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.body, result.body]) : acc) : isErr(acc) ? newErr([...acc.body, result.body]) : newErr([result.body])), newOk([]));
