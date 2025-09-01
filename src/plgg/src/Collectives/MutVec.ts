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
  export interface MapKind1<A> {
    MutVec: MutVec<A>;
  }
}

/**
 * Mutable vector type providing functional programming operations.
 */
export type MutVec<T extends unknown = unknown> =
  Array<T>;

/**
 * Type guard to check if a value is a MutVec.
 */
const is = <T>(
  value: unknown,
): value is MutVec<T> => Array.isArray(value);

/**
 * Refinable instance for mutable vector type guards.
 */
export const mutVecRefinable: Refinable1<"MutVec"> =
  {
    KindKey: "MutVec",
    is,
  };
/**
 * Exported type guard function for mutable vector values.
 */
export const { is: isMutVec } = mutVecRefinable;

/**
 * Castable instance for mutable vector safe casting.
 */
export const mutVecCastable: Castable1<"MutVec"> =
  {
    KindKey: "MutVec",
    as: <A>(
      value: unknown,
    ): Result<MutVec<A>, InvalidError> =>
      is<A>(value)
        ? newOk(value)
        : newErr(
            new InvalidError({
              message: "Value is not a vector",
            }),
          ),
  };
/**
 * Exported safe casting function for mutable vector values.
 */
export const { as: asMutVec } = mutVecCastable;

/**
 * Functor instance providing mapping operations over mutable vector elements.
 */
export const mutVecFunctor: Functor1<"MutVec"> = {
  KindKey: "MutVec",
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: MutVec<T1>): MutVec<T2> =>
      fa.map(f),
};
/**
 * Exported mapping function for mutable vectors.
 */
export const { map: mapMutVec } = mutVecFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const mutVecApply: Apply1<"MutVec"> = {
  ...mutVecFunctor,
  ap:
    <T1, T2>(fab: MutVec<(a: T1) => T2>) =>
    (fa: MutVec<T1>): MutVec<T2> =>
      fab.flatMap((f) => fa.map(f)),
};
/**
 * Exported application function for mutable vectors.
 */
export const { ap: applyMutVec } = mutVecApply;

/**
 * Pointed instance enabling wrapping of values in mutable vector context.
 */
export const mutVecPointed: Pointed1<"MutVec"> = {
  ...mutVecFunctor,
  of: <T>(a: T): MutVec<T> => [a],
};

/**
 * Exported value wrapping function for mutable vectors.
 */
export const { of: ofMutVec } = mutVecPointed;

/**
 * Applicative instance combining Apply and Pointed for mutable vectors.
 */
export const mutVecApplicative: Applicative1<"MutVec"> =
  {
    ...mutVecApply,
    ...mutVecFunctor,
    ...mutVecPointed,
  };

/**
 * Chain instance enabling chaining of operations that return mutable vectors.
 */
export const mutVecChain: Chain1<"MutVec"> = {
  ...mutVecFunctor,
  ...mutVecApply,
  ...mutVecPointed,
  chain:
    <T1, T2>(f: (a: T1) => MutVec<T2>) =>
    (fa: MutVec<T1>): MutVec<T2> =>
      fa.flatMap(f),
};
/**
 * Exported chaining function for mutable vectors.
 */
export const { chain: chainMutVec } = mutVecChain;

/**
 * Monad instance providing full monadic interface for mutable vectors.
 */
export const mutVecMonad: Monad1<"MutVec"> = {
  ...mutVecApplicative,
  ...mutVecChain,
};

/**
 * Foldable instance providing fold operations for mutable vectors.
 */
export const mutVecFoldable: Foldable1<"MutVec"> =
  {
    KindKey: "MutVec",
    foldr:
      <A, B>(f: (a: A, b: B) => B) =>
      (initial: B) =>
      (fa: MutVec<A>): B =>
        fa.reduceRight(
          (acc, x) => f(x, acc),
          initial,
        ),
    foldl:
      <A, B>(f: (b: B, a: A) => B) =>
      (initial: B) =>
      (fa: MutVec<A>): B =>
        fa.reduce(f, initial),
  };
/**
 * Exported fold functions for mutable vectors.
 */
export const {
  foldr: foldrMutVec,
  foldl: foldlMutVec,
} = mutVecFoldable;

/**
 * Traversable instance providing structure-preserving traversal for mutable vectors.
 */
export const mutVecTraversable: Traversable1<"MutVec"> =
  {
    ...mutVecFunctor,
    ...mutVecFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B>(f: (a: A) => Kind1<F, B>) =>
      (ta: MutVec<A>): Kind1<F, MutVec<B>> =>
        ta.reduceRight(
          (acc: Kind1<F, MutVec<B>>, x: A) =>
            A.ap(
              A.map((b: B) => (bs: MutVec<B>) => [
                b,
                ...bs,
              ])(f(x)),
            )(acc),
          A.of([]),
        ),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: MutVec<Kind1<F, A>>,
      ): Kind1<F, MutVec<A>> =>
        mutVecTraversable.traverse(A)(
          (fa: Kind1<F, A>) => fa,
        )(tfa),
  };
/**
 * Exported traversal functions for mutable vectors.
 */
export const {
  traverse: traverseMutVec,
  sequence: sequenceMutVec,
} = mutVecTraversable;

/**
 * Applies function to each element, collecting all results or errors.
 */
export const concludeMutVec =
  <T, U, F>(fn: (item: T) => Result<U, F>) =>
  (
    vec: MutVec<T>,
  ): Result<MutVec<U>, MutVec<F>> =>
    vec
      .map(fn)
      .reduce<
        Result<MutVec<U>, MutVec<F>>
      >((acc, result) => (isOk(result) ? (isOk(acc) ? newOk([...acc.body, result.body]) : acc) : isErr(acc) ? newErr([...acc.body, result.body]) : newErr([result.body])), newOk([]));

