import {
  Monad2,
  Functor2,
  Apply2,
  Pointed2,
  Applicative1,
  Applicative2,
  Chain2,
  Foldable2,
  Traversable2,
  KindKeys1,
  Kind1,
  newOk,
  isOk,
  Ok,
  Err,
  newErr,
  isErr,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface KindKeytoKind2<A, B> {
    Result: Result<A, B>;
  }
}

/**
 * Result type for functional error handling without exceptions.
 * Represents a computation that can either succeed (Ok) or fail (Err).
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Type guard to check if a value is a Result (either Ok or Err).
 */
export const isResult = <T, F>(
  e: unknown,
): e is Result<T, F> => isOk<T>(e) || isErr<F>(e);

/**
 * Functor instance for Result.
 * Maps functions over successful values while preserving errors.
 */
export const resultFunctor: Functor2<"Result"> = {
  KindKey: "Result",
  map:
    <T1, T2, E>(f: (a: T1) => T2) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fa) ? newOk<T2>(f(fa.content)) : fa,
};
export const { map: mapResult } = resultFunctor;

/**
 * Apply instance for Result.
 * Applies wrapped functions to wrapped values.
 */
export const resultApply: Apply2<"Result"> = {
  ...resultFunctor,
  ap:
    <T1, T2, E>(fab: Result<(a: T1) => T2, E>) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fab)
        ? isOk(fa)
          ? newOk<T2>(fab.content(fa.content))
          : fa
        : fab,
};
export const { ap: applyResult } = resultApply;

/**
 * Pointed instance for Result.
 * Wraps values in successful Result context.
 */
export const resultPointed: Pointed2<"Result"> = {
  ...resultFunctor,
  of: <T = never, E = never>(
    a: T,
  ): Result<T, E> => newOk<T>(a),
};
export const { of: ofResult } = resultPointed;

/**
 * Applicative instance for Result.
 * Combines Apply and Pointed to provide both function application and value lifting.
 * Enables working with functions and values wrapped in Result contexts.
 */
export const resultApplicative: Applicative2<"Result"> =
  {
    ...resultApply,
    ...resultFunctor,
    ...resultPointed,
  };

/**
 * Chain instance for Result.
 * Chains operations that return Results.
 */
export const resultChain: Chain2<"Result"> = {
  ...resultFunctor,
  ...resultApply,
  ...resultPointed,
  chain:
    <T1, T2, E1>(f: (a: T1) => Result<T2, E1>) =>
    <E2>(
      fa: Result<T1, E2>,
    ): Result<T2, E1 | E2> =>
      isOk(fa) ? f(fa.content) : fa,
};

export const { chain: chainResult } = resultChain;

/**
 * Monad instance for Result.
 * Combines Applicative and Chain to provide full monadic interface.
 */
export const resultMonad: Monad2<"Result"> = {
  ...resultApplicative,
  ...resultChain,
};

/**
 * Foldable instance for Result.
 * Folds over success values only; errors are ignored.
 */
export const resultFoldable: Foldable2<"Result"> =
  {
    KindKey: "Result",
    foldr:
      <A, B, C>(f: (a: A, b: B) => B) =>
      (initial: B) =>
      (fa: Result<A, C>): B =>
        isOk(fa)
          ? f(fa.content, initial)
          : initial,
    foldl:
      <A, B, C>(f: (b: B, a: A) => B) =>
      (initial: B) =>
      (fa: Result<A, C>): B =>
        isOk(fa)
          ? f(initial, fa.content)
          : initial,
  };

export const {
  foldr: foldrResult,
  foldl: foldlResult,
} = resultFoldable;

/**
 * Traversable instance for Result.
 * Extends Functor and Foldable to provide structure-preserving traversal.
 */
export const resultTraversable: Traversable2<"Result"> =
  {
    ...resultFunctor,
    ...resultFoldable,
    traverse:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, B, C>(f: (a: A) => Kind1<F, B>) =>
      (
        ta: Result<A, C>,
      ): Kind1<F, Result<B, C>> => {
        if (isOk(ta)) {
          return A.map(newOk)(f(ta.content));
        } else {
          return A.of(newErr(ta.content));
        }
      },
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, C>(
        tfa: Result<Kind1<F, A>, C>,
      ): Kind1<F, Result<A, C>> => {
        if (isOk(tfa)) {
          return A.map(newOk)(tfa.content);
        } else {
          return A.of(newErr(tfa.content));
        }
      },
  };
export const {
  traverse: traverseResult,
  sequence: sequenceResult,
} = resultTraversable;
