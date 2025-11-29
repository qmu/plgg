import {
  Result,
  InvalidError,
  Refinable1,
  Castable1,
  Functor1,
  Apply1,
  Pointed1,
  Applicative1,
  Chain1,
  Foldable1,
  Traversable1,
  Monad1,
  KindKeys1,
  Kind1,
  ok,
  err,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    MutRec: RawObj<A>;
  }
}

/**
 * Mutable record type for functional programming operations.
 */
export type RawObj<T = Record<string, unknown>> =
  T;

/**
 * Type guard to check if a value is a MutRec.
 */
const is = <T = Record<string, unknown>>(
  value: unknown,
): value is RawObj<T> =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for mutable record type guards.
 */
export const mutRecRefinable: Refinable1<"MutRec"> =
  {
    KindKey: "MutRec",
    is,
  };
/**
 * Exported type guard function for mutable record values.
 */
export const { is: isRawObj } = mutRecRefinable;

export const asRawObj = <A>(
  value: unknown,
): Result<RawObj<A>, InvalidError> =>
  is<A>(value)
    ? ok(value)
    : err(
        new InvalidError({
          message: "Not record",
        }),
      );

/**
 * Castable instance for mutable record safe casting.
 */
export const mutRecCastable: Castable1<"MutRec"> =
  {
    KindKey: "MutRec",
    as: asRawObj,
  };

/**
 * Functor instance providing mapping operations over mutable record values.
 */
export const mutRecFunctor: Functor1<"MutRec"> = {
  KindKey: "MutRec",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: RawObj<A>): RawObj<B> =>
      f(fa),
};
/**
 * Exported mapping function for mutable records.
 */
export const { map: mapRawObj } = mutRecFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const mutRecApply: Apply1<"MutRec"> = {
  ...mutRecFunctor,
  ap:
    <A, B>(fab: RawObj<(a: A) => B>) =>
    (fa: RawObj<A>): RawObj<B> =>
      (fab as (a: A) => B)(fa),
};
/**
 * Exported application function for mutable records.
 */
export const { ap: applyRawObj } = mutRecApply;

/**
 * Pointed instance enabling wrapping of values in mutable record context.
 */
export const mutRecPointed: Pointed1<"MutRec"> = {
  ...mutRecFunctor,
  of: <A>(a: A): RawObj<A> => a,
};
/**
 * Exported value wrapping function for mutable records.
 */
export const { of: ofRawObj } = mutRecPointed;

/**
 * Applicative instance combining Apply and Pointed for mutable records.
 */
export const mutRecApplicative: Applicative1<"MutRec"> =
  {
    ...mutRecApply,
    ...mutRecFunctor,
    ...mutRecPointed,
  };

/**
 * Chain instance enabling chaining of operations that return objects.
 */
export const mutRecChain: Chain1<"MutRec"> = {
  ...mutRecFunctor,
  ...mutRecApply,
  ...mutRecPointed,
  chain:
    <A, B>(f: (a: A) => RawObj<B>) =>
    (fa: RawObj<A>): RawObj<B> =>
      f(fa),
};
/**
 * Exported chaining function for mutable records.
 */
export const { chain: chainRawObj } = mutRecChain;

/**
 * Monad instance providing full monadic interface for mutable records.
 */
export const mutRecMonad: Monad1<"MutRec"> = {
  ...mutRecApplicative,
  ...mutRecChain,
};

/**
 * Foldable instance providing fold operations for mutable records.
 */
export const mutRecFoldable: Foldable1<"MutRec"> =
  {
    KindKey: "MutRec",
    foldr:
      <A, B>(f: (a: A, b: B) => B) =>
      (initial: B) =>
      (fa: RawObj<A>): B =>
        f(fa, initial),
    foldl:
      <A, B>(f: (b: B, a: A) => B) =>
      (initial: B) =>
      (fa: RawObj<A>): B =>
        f(initial, fa),
  };
/**
 * Exported fold functions for mutable records.
 */
export const {
  foldr: foldrRawObj,
  foldl: foldlRawObj,
} = mutRecFoldable;

/**
 * Traversable instance providing structure-preserving traversal for mutable records.
 */
export const mutRecTraversable: Traversable1<"MutRec"> =
  {
    ...mutRecFunctor,
    ...mutRecFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B>(f: (a: A) => Kind1<F, B>) =>
      (ta: RawObj<A>): Kind1<F, RawObj<B>> =>
        A.map((b: B) => b)(f(ta)),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: RawObj<Kind1<F, A>>,
      ): Kind1<F, RawObj<A>> =>
        A.map((a: A) => a)(tfa as Kind1<F, A>),
  };
/**
 * Exported traversal functions for mutable records.
 */
export const {
  traverse: traverseRawObj,
  sequence: sequenceRawObj,
} = mutRecTraversable;
