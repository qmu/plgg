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
    Obj: Obj<A>;
  }
}

/**
 * Object type with primitive values.
 * Readonly record with string keys and unknown values.
 */
export type Obj<T = Record<string, unknown>> = Readonly<T>;

/**
 * Type guard to check if a value is an Obj.
 */
const is = <T>(value: unknown): value is Obj<T> =>
  typeof value === "object" && value !== null;

/**
 * Refinable instance for object type guards.
 */
export const objRefinable: Refinable1<"Obj"> = {
  KindKey: "Obj",
  is,
};
export const { is: isObj } = objRefinable;

/**
 * Castable instance for object safe casting.
 */
export const objCastable: Castable1<"Obj"> = {
  KindKey: "Obj",
  as: <A>(value: unknown): Result<Obj<A>, InvalidError> =>
    is<A>(value)
      ? newOk(value)
      : newErr(
          new InvalidError({
            message: "Not object",
          }),
        ),
};
export const { as: asObj } = objCastable;

/**
 * Functor instance for Obj.
 * Maps functions over object values while preserving structure.
 */
export const objFunctor: Functor1<"Obj"> = {
  KindKey: "Obj",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Obj<A>): Obj<B> =>
      f(fa),
};
export const { map: mapObj } = objFunctor;

/**
 * Apply instance for Obj.
 * Applies wrapped functions to wrapped values.
 */
export const objApply: Apply1<"Obj"> = {
  ...objFunctor,
  ap:
    <A, B>(fab: Obj<(a: A) => B>) =>
    (fa: Obj<A>): Obj<B> =>
      (fab as (a: A) => B)(fa),
};
export const { ap: applyObj } = objApply;

/**
 * Pointed instance for Obj.
 * Wraps a value in an object context.
 */
export const objPointed: Pointed1<"Obj"> = {
  ...objFunctor,
  of: <A>(a: A): Obj<A> => a,
};
export const { of: ofObj } = objPointed;

/**
 * Applicative instance for Obj.
 * Combines Apply and Pointed to provide both function application and value lifting.
 */
export const objApplicative: Applicative1<"Obj"> = {
  ...objApply,
  ...objFunctor,
  ...objPointed,
};

/**
 * Chain instance for Obj.
 * Chains operations that return objects.
 */
export const objChain: Chain1<"Obj"> = {
  ...objFunctor,
  ...objApply,
  ...objPointed,
  chain:
    <A, B>(f: (a: A) => Obj<B>) =>
    (fa: Obj<A>): Obj<B> =>
      f(fa),
};
export const { chain: chainObj } = objChain;

/**
 * Monad instance for Obj.
 * Combines Applicative and Chain to provide the full monadic interface.
 */
export const objMonad: Monad1<"Obj"> = {
  ...objApplicative,
  ...objChain,
};

/**
 * Foldable instance for Obj.
 * Provides fold/reduce operations for objects.
 */
export const objFoldable: Foldable1<"Obj"> = {
  KindKey: "Obj",
  foldr:
    <A, B>(f: (a: A, b: B) => B) =>
    (initial: B) =>
    (fa: Obj<A>): B =>
      f(fa, initial),
  foldl:
    <A, B>(f: (b: B, a: A) => B) =>
    (initial: B) =>
    (fa: Obj<A>): B =>
      f(initial, fa),
};
export const {
  foldr: foldrObj,
  foldl: foldlObj,
} = objFoldable;

/**
 * Traversable instance for Obj.
 * Extends Functor and Foldable to provide structure-preserving traversal.
 */
export const objTraversable: Traversable1<"Obj"> = {
  ...objFunctor,
  ...objFoldable,
  traverse:
    <F extends KindKeys1>(A: Applicative1<F>) =>
    <A, B>(f: (a: A) => Kind1<F, B>) =>
    (ta: Obj<A>): Kind1<F, Obj<B>> =>
      A.map((b: B) => b)(f(ta)),
  sequence:
    <F extends KindKeys1>(A: Applicative1<F>) =>
    <A>(tfa: Obj<Kind1<F, A>>): Kind1<F, Obj<A>> =>
      A.map((a: A) => a)(tfa as Kind1<F, A>),
};
export const {
  traverse: traverseObj,
  sequence: sequenceObj,
} = objTraversable;

/**
 * Validates and transforms an object property using a predicate.
 */
export const forProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    obj: V,
  ): Result<V & Record<T, U>, InvalidError> =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, U>,
              InvalidError
            > =>
              newOk({ ...obj, [key]: okValue }),
          ),
        )
      : newErr(
          new InvalidError({
            message: `Property '${key}' not found`,
          }),
        );

/**
 * Validates optional object property with predicate.
 */
export const forOptionProp =
  <T extends string, U>(
    key: T,
    predicate: (
      a: unknown,
    ) => Result<U, InvalidError>,
  ) =>
  <V extends object>(
    obj: V,
  ): Result<
    V & Record<T, Option<U>>,
    InvalidError
  > =>
    hasProp(obj, key)
      ? pipe(
          obj[key],
          predicate,
          chainResult(
            (
              okValue,
            ): Result<
              V & Record<T, Option<U>>,
              InvalidError
            > =>
              newOk({
                ...obj,
                [key]: newSome(okValue),
              }),
          ),
        )
      : newOk({ ...obj, [key]: newNone() } as V &
          Record<T, Option<U>>);

/**
 * Type guard for object field existence.
 */
export const hasProp = <K extends string>(
  value: object,
  key: K,
): value is Record<K, unknown> => key in value;