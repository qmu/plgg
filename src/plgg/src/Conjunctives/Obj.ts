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
 * Readonly object type for functional programming operations.
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
/**
 * Exported type guard function for object values.
 */
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
/**
 * Exported safe casting function for object values.
 */
export const { as: asObj } = objCastable;

/**
 * Functor instance providing mapping operations over object values.
 */
export const objFunctor: Functor1<"Obj"> = {
  KindKey: "Obj",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Obj<A>): Obj<B> =>
      f(fa),
};
/**
 * Exported mapping function for objects.
 */
export const { map: mapObj } = objFunctor;

/**
 * Apply instance enabling application of wrapped functions to wrapped values.
 */
export const objApply: Apply1<"Obj"> = {
  ...objFunctor,
  ap:
    <A, B>(fab: Obj<(a: A) => B>) =>
    (fa: Obj<A>): Obj<B> =>
      (fab as (a: A) => B)(fa),
};
/**
 * Exported application function for objects.
 */
export const { ap: applyObj } = objApply;

/**
 * Pointed instance enabling wrapping of values in object context.
 */
export const objPointed: Pointed1<"Obj"> = {
  ...objFunctor,
  of: <A>(a: A): Obj<A> => a,
};
/**
 * Exported value wrapping function for objects.
 */
export const { of: ofObj } = objPointed;

/**
 * Applicative instance combining Apply and Pointed for objects.
 */
export const objApplicative: Applicative1<"Obj"> = {
  ...objApply,
  ...objFunctor,
  ...objPointed,
};

/**
 * Chain instance enabling chaining of operations that return objects.
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
/**
 * Exported chaining function for objects.
 */
export const { chain: chainObj } = objChain;

/**
 * Monad instance providing full monadic interface for objects.
 */
export const objMonad: Monad1<"Obj"> = {
  ...objApplicative,
  ...objChain,
};

/**
 * Foldable instance providing fold operations for objects.
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
/**
 * Exported fold functions for objects.
 */
export const {
  foldr: foldrObj,
  foldl: foldlObj,
} = objFoldable;

/**
 * Traversable instance providing structure-preserving traversal for objects.
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
/**
 * Exported traversal functions for objects.
 */
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