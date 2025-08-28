import {
  Result,
  newOk,
  newErr,
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
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1<A> {
    MutRec: MutRec<A>;
  }
}

/**
 * Mutable record type for functional programming operations.
 */
export type MutRec<T = Record<string, unknown>> =
  T;

/**
 * Type guard to check if a value is a MutRec.
 */
const is = <T>(
  value: unknown,
): value is MutRec<T> =>
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
export const { is: isMutRec } = mutRecRefinable;

/**
 * Castable instance for mutable record safe casting.
 */
export const mutRecCastable: Castable1<"MutRec"> =
  {
    KindKey: "MutRec",
    as: <A>(
      value: unknown,
    ): Result<MutRec<A>, InvalidError> =>
      is<A>(value)
        ? newOk(value)
        : newErr(
            new InvalidError({
              message: "Not record",
            }),
          ),
  };
/**
 * Exported safe casting function for mutable record values.
 */
export const { as: asMutRec } = mutRecCastable;

/**
 * Functor instance providing mapping operations over mutable record values.
 */
export const mutRecFunctor: Functor1<"MutRec"> = {
  KindKey: "MutRec",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: MutRec<A>): MutRec<B> =>
      f(fa),
};
/**
 * Exported mapping function for mutable records.
 */
export const { map: mapMutRec } = mutRecFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const mutRecApply: Apply1<"MutRec"> = {
  ...mutRecFunctor,
  ap:
    <A, B>(fab: MutRec<(a: A) => B>) =>
    (fa: MutRec<A>): MutRec<B> =>
      (fab as (a: A) => B)(fa),
};
/**
 * Exported application function for mutable records.
 */
export const { ap: applyMutRec } = mutRecApply;

/**
 * Pointed instance enabling wrapping of values in mutable record context.
 */
export const mutRecPointed: Pointed1<"MutRec"> = {
  ...mutRecFunctor,
  of: <A>(a: A): MutRec<A> => a,
};
/**
 * Exported value wrapping function for mutable records.
 */
export const { of: ofMutRec } = mutRecPointed;

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
    <A, B>(f: (a: A) => MutRec<B>) =>
    (fa: MutRec<A>): MutRec<B> =>
      f(fa),
};
/**
 * Exported chaining function for mutable records.
 */
export const { chain: chainMutRec } = mutRecChain;

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
      (fa: MutRec<A>): B =>
        f(fa, initial),
    foldl:
      <A, B>(f: (b: B, a: A) => B) =>
      (initial: B) =>
      (fa: MutRec<A>): B =>
        f(initial, fa),
  };
/**
 * Exported fold functions for mutable records.
 */
export const {
  foldr: foldrMutRec,
  foldl: foldlMutRec,
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
      (ta: MutRec<A>): Kind1<F, MutRec<B>> =>
        A.map((b: B) => b)(f(ta)),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: MutRec<Kind1<F, A>>,
      ): Kind1<F, MutRec<A>> =>
        A.map((a: A) => a)(tfa as Kind1<F, A>),
  };
/**
 * Exported traversal functions for mutable records.
 */
export const {
  traverse: traverseMutRec,
  sequence: sequenceMutRec,
} = mutRecTraversable;
