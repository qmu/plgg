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
  Ok,
  Err,
  ok,
  isOk,
  err,
  isErr,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind2<A, B> {
    Result: Result<A, B>;
  }
}

/**
 * Represents computations that can either succeed or fail without exceptions.
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Type guard to check if a value is a Result (either Ok or Err).
 */
export const isResult = <T, F>(
  e: unknown,
): e is Result<T, F> => isOk<T>(e) || isErr<F>(e);

/**
 * Functor instance for mapping over successful values while preserving errors.
 * @internal
 */
export const resultFunctor: Functor2<"Result"> = {
  KindKey: "Result",
  map:
    <T1, T2, E>(f: (a: T1) => T2) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fa) ? ok<T2>(f(fa.content)) : fa,
};

/**
 * Maps over the success channel, preserving the error channel — the mirror of
 * {@link mapErr}. The error type `E` lives on the inner (data-last) function,
 * not the outer one, so it is inferred from the argument even when applied
 * point-free: `mapResult(f)(x)` keeps `x`'s error type instead of widening it
 * to `unknown` (the trap the shared typeclass `resultFunctor.map` falls into,
 * where all three parameters bind on the outer generic). Prefer this standalone
 * `mapResult` in application code; `resultFunctor.map` stays for the HKT.
 */
export const mapResult =
  <T1, T2>(f: (a: T1) => T2) =>
  <E>(fa: Result<T1, E>): Result<T2, E> =>
    isOk(fa) ? ok<T2>(f(fa.content)) : fa;

/**
 * Maps over the error channel, leaving success values untouched — the mirror of
 * {@link mapResult}. Data-last, so `pipe(result, mapErr(badRequest))` rewrites a
 * failure's type at the seam without an `isErr` branch.
 */
export const mapErr =
  <E, F>(f: (e: E) => F) =>
  <T>(fa: Result<T, E>): Result<T, F> =>
    isErr(fa) ? err<F>(f(fa.content)) : fa;

/**
 * Case eliminator for Result: folds both channels into a single value, so
 * callers never branch on `isOk`/`isErr` or reach into `.content` by hand.
 * Error-first to parallel {@link matchOption}. Data-last for use in `pipe`.
 */
export const matchResult =
  <T, E, R>(
    onErr: (error: E) => R,
    onOk: (value: T) => R,
  ) =>
  (result: Result<T, E>): R =>
    isOk(result)
      ? onOk(result.content)
      : onErr(result.content);

/**
 * Apply instance for Result.
 * Applies wrapped functions to wrapped values.
 * @internal
 */
export const resultApply: Apply2<"Result"> = {
  ...resultFunctor,
  ap:
    <T1, T2, E>(fab: Result<(a: T1) => T2, E>) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fab)
        ? isOk(fa)
          ? ok<T2>(fab.content(fa.content))
          : fa
        : fab,
};
export const { ap: applyResult } = resultApply;

/**
 * Pointed instance for Result.
 * Wraps values in successful Result context.
 * @internal
 */
export const resultPointed: Pointed2<"Result"> = {
  ...resultFunctor,
  of: <T = never, E = never>(
    a: T,
  ): Result<T, E> => ok<T>(a),
};
export const { of: ofResult } = resultPointed;

/**
 * Applicative instance for Result.
 * @internal
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
 * @internal
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
 * @internal
 */
export const resultMonad: Monad2<"Result"> = {
  ...resultApplicative,
  ...resultChain,
};

/**
 * Foldable instance for Result.
 * Folds over success values only; errors are ignored.
 * @internal
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
 * @internal
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
          return A.map(ok)(f(ta.content));
        } else {
          return A.of(err(ta.content));
        }
      },
    sequence:
      <F extends KindKeys1>(A: Applicative1<F>) =>
      <A, C>(
        tfa: Result<Kind1<F, A>, C>,
      ): Kind1<F, Result<A, C>> => {
        if (isOk(tfa)) {
          return A.map(ok)(tfa.content);
        } else {
          return A.of(err(tfa.content));
        }
      },
  };
export const {
  traverse: traverseResult,
  sequence: sequenceResult,
} = resultTraversable;
