import {
  Result,
  newOk,
  newErr,
  InvalidError,
  Functor1Rec,
  Apply1Rec,
  Pointed1Rec,
  Applicative1Rec,
  Chain1Rec,
  Foldable1Rec,
  Traversable1Rec,
  Traverse1Rec,
  Monad1Rec,
  KindKeys1,
  Kind1,
  Applicative1,
  Refinable1Rec,
  Castable1Rec,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind1Rec<A> {
    Rec: Rec<A>;
  }
}

/**
 * Readonly record type for functional programming operations.
 */
export type Rec<
  T extends Record<string, unknown> = Record<
    string,
    unknown
  >,
> = Readonly<T>;

/**
 * Type guard to check if a value is an Rec.
 */
const is = <T extends Record<string, unknown>>(
  value: unknown,
): value is Rec<T> =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for record type guards.
 */
export const recRefinable: Refinable1Rec<"Rec"> =
  {
    KindKey: "Rec",
    is,
  };
/**
 * Exported type guard function for record values.
 */
/**
 * Exported type guard function for record values.
 */
export const { is: isRec } = recRefinable;

/**
 * Castable instance for record safe casting.
 */
export const recCastable: Castable1Rec<"Rec"> = {
  KindKey: "Rec",
  as: <A extends Record<string, unknown>>(
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
export const recFunctor: Functor1Rec<"Rec"> = {
  KindKey: "Rec",
  map:
    <
      A extends Record<string, unknown>,
      B extends Record<string, unknown>,
    >(f: (a: A) => B) =>
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
export const recApply: Apply1Rec<"Rec"> = {
  ...recFunctor,
  ap:
    <
      A extends Record<string, unknown>,
      B extends Record<string, unknown>,
    >(fab: Rec<A>) =>
    (fa: Rec<A>): Rec<B> =>
      fab,
};
/**
 * Exported application function for records.
 */
export const { ap: applyRec } = recApply;

/**
 * Pointed instance enabling wrapping of values in record context.
 */
export const recPointed: Pointed1Rec<"Rec"> = {
  KindKey: "Rec",
  of: <A extends Record<string, unknown>>(
    a: A,
  ): Rec<A> => a,
};
/**
 * Exported value wrapping function for records.
 */
export const { of: ofRec } = recPointed;

/**
 * Applicative instance combining Apply and Pointed for records.
 */
export const recApplicative: Applicative1Rec<"Rec"> =
  {
    ...recApply,
    ...recPointed,
  };

/**
 * Chain instance enabling chaining of operations that return objects.
 */
export const recChain: Chain1Rec<"Rec"> = {
  ...recApply,
  ...recPointed,
  chain:
    <
      A extends Record<string, unknown>,
      B extends Record<string, unknown>,
    >(f: (a: A) => Rec<B>) =>
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
export const recMonad: Monad1Rec<"Rec"> = {
  ...recApplicative,
  ...recChain,
};

/**
 * Foldable instance providing fold operations for records.
 */
export const recFoldable: Foldable1Rec<"Rec"> = {
  KindKey: "Rec",
  foldr:
    <A extends Record<string, unknown>, B>(
      f: (a: A, b: B) => B,
    ) =>
    (initial: B) =>
    (fa: Rec<A>): B =>
      f(fa, initial),
  foldl:
    <A extends Record<string, unknown>, B>(
      f: (b: B, a: A) => B,
    ) =>
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
export const recTraversable: Traversable1Rec<"Rec"> =
  {
    ...recFunctor,
    ...recFoldable,
    traverse: ((
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <
        A extends Record<string, unknown>,
        B,
      >(f: (a: A) => Kind1<F, B>) =>
      (ta: Rec<A>): Kind1<F, Rec<A>> =>
        A.map(() => ta)(f(ta))
    )) as Traverse1Rec<"Rec">,
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A extends Record<string, unknown>>(
        tfa: Rec<A>,
      ): Kind1<F, Rec<A>> =>
        A.of(tfa),
  };
/**
 * Exported traversal functions for records.
 */
export const {
  traverse: traverseRec,
  sequence: sequenceRec,
} = recTraversable;
