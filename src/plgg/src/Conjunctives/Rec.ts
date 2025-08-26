import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Option,
  newSome,
  newNone,
  pipe,
  chainResult,
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
    Rec: Rec<A>;
  }
}

/**
 * Readonly record type for functional programming operations.
 */
export type Rec<T = Record<string, unknown>> =
  Readonly<T>;

/**
 * Type guard to check if a value is an Rec.
 */
const is = <T>(value: unknown): value is Rec<T> =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for record type guards.
 */
export const recRefinable: Refinable1<"Rec"> = {
  KindKey: "Rec",
  is,
};
/**
 * Exported type guard function for record values.
 */
export const { is: isRec } = recRefinable;

/**
 * Castable instance for record safe casting.
 */
export const recCastable: Castable1<"Rec"> = {
  KindKey: "Rec",
  as: <A>(
    value: unknown,
  ): Result<Rec<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Not record",
          }),
        ),
};
/**
 * Exported safe casting function for record values.
 */
export const { as: asRec } = recCastable;

/**
 * Functor instance providing mapping operations over record values.
 */
export const recFunctor: Functor1<"Rec"> = {
  KindKey: "Rec",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Rec<A>): Rec<B> =>
      f(fa),
};
/**
 * Exported mapping function for records.
 */
export const { map: mapRec } = recFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const recApply: Apply1<"Rec"> = {
  ...recFunctor,
  ap:
    <A, B>(fab: Rec<(a: A) => B>) =>
    (fa: Rec<A>): Rec<B> =>
      (fab as (a: A) => B)(fa),
};
/**
 * Exported application function for records.
 */
export const { ap: applyRec } = recApply;

/**
 * Pointed instance enabling wrapping of values in record context.
 */
export const recPointed: Pointed1<"Rec"> = {
  ...recFunctor,
  of: <A>(a: A): Rec<A> => a,
};
/**
 * Exported value wrapping function for records.
 */
export const { of: ofRec } = recPointed;

/**
 * Applicative instance combining Apply and Pointed for records.
 */
export const recApplicative: Applicative1<"Rec"> =
  {
    ...recApply,
    ...recFunctor,
    ...recPointed,
  };

/**
 * Chain instance enabling chaining of operations that return objects.
 */
export const recChain: Chain1<"Rec"> = {
  ...recFunctor,
  ...recApply,
  ...recPointed,
  chain:
    <A, B>(f: (a: A) => Rec<B>) =>
    (fa: Rec<A>): Rec<B> =>
      f(fa),
};
/**
 * Exported chaining function for reocrds.
 */
export const { chain: chainRec } = recChain;

/**
 * Monad instance providing full monadic interface for records.
 */
export const recMonad: Monad1<"Rec"> = {
  ...recApplicative,
  ...recChain,
};

/**
 * Foldable instance providing fold operations for records.
 */
export const recFoldable: Foldable1<"Rec"> = {
  KindKey: "Rec",
  foldr:
    <A, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Rec<A>): B =>
      f(fa, initial),
  foldl:
    <A, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Rec<A>): B =>
      f(initial, fa),
};
/**
 * Exported fold functions for records.
 */
export const {
  foldr: foldrRec,
  foldl: foldlRec,
} = recFoldable;

/**
 * Traversable instance providing structure-preserving traversal for records.
 */
export const recTraversable: Traversable1<"Rec"> =
  {
    ...recFunctor,
    ...recFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B>(f: (a: A) => Kind1<F, B>) =>
      (ta: Rec<A>): Kind1<F, Rec<B>> =>
        A.map((b: B) => b)(f(ta)),
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A>(
        tfa: Rec<Kind1<F, A>>,
      ): Kind1<F, Rec<A>> =>
        A.map((a: A) => a)(tfa as Kind1<F, A>),
  };
/**
 * Exported traversal functions for records.
 */
export const {
  traverse: traverseRec,
  sequence: sequenceRec,
} = recTraversable;

/**
 * Validates and transforms an record property using a predicate.
 */
export const forProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    rec: V,
  ): Result<V & Record<T, U>, InvalidError> =>
    hasProp(rec, key)
      ? pipe(
          rec[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, U>,
              InvalidError
            > =>
              newOk({ ...rec, [key]: okValue }),
          ),
        )
      : newErr(
          new InvalidError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional record property with predicate.
 */
export const forOptionProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    rec: V,
  ): Result<
    V & Record<T, Option<U>>,
    InvalidError
  > =>
    hasProp(rec, key)
      ? pipe(
          rec[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, Option<U>>,
              InvalidError
            > =>
              newOk({
                ...rec,
                [key]: newSome(okValue),
              }),
          ),
        )
      : newOk({ ...rec, [key]: newNone() } as V &
          Record<T, Option<U>>);

/**
 * Type guard for record field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;

