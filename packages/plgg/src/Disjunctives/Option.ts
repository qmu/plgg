import {
  Monad1,
  Functor1,
  Apply1,
  Pointed1,
  Applicative1,
  Chain1,
  Some,
  None,
  Result,
  some,
  isSome,
  none,
  isNone,
  isOk,
  ok,
  err,
} from "plgg/index";

declare module "plgg/Abstracts/Principals/Kind" {
  export interface MapKind1<A> {
    Option: Option<A>;
  }
}

/**
 * Option type for type-safe null handling.
 * Represents a value that may or may not exist.
 */
export type Option<T> = Some<T> | None;

/**
 * Type guard to check if a value is an Option (either Some or None).
 */
export const isOption = <T>(
  e: unknown,
): e is Option<T> => isSome(e) || isNone(e);

/**
 * Builds an Option from a possibly-nullish value.
 * `null` and `undefined` become `None`; anything else becomes `Some`.
 */
export const fromNullable = <T>(
  value: T | null | undefined,
): Option<T> =>
  value === null || value === undefined
    ? none()
    : some(value);

/**
 * Extracts the value from an Option, falling back to a default for `None`.
 */
export const getOr =
  <T>(fallback: T) =>
  (option: Option<T>): T =>
    isSome(option) ? option.content : fallback;

/**
 * Converts a Result into an Option, discarding the error.
 */
export const toOption = <T>(
  result: Result<T, unknown>,
): Option<T> =>
  isOk(result)
    ? some(result.content)
    : none();

/**
 * Case eliminator for Option: folds both cases into a single value, so callers
 * never branch on `isSome`/`isNone` or reach into `.content` by hand. Data-last
 * for use in `pipe`.
 */
export const matchOption =
  <T, R>(
    onNone: () => R,
    onSome: (value: T) => R,
  ) =>
  (option: Option<T>): R =>
    isSome(option)
      ? onSome(option.content)
      : onNone();

/**
 * Bridges an Option into a Result: `Some` becomes `Ok`, `None` becomes `Err`
 * carrying the supplied error. The inverse of {@link toOption}. Data-last, so
 * `pipe(opt, mapOption(f), okOr(error))` turns an absent value into a typed
 * failure without an `isSome` branch.
 */
export const okOr =
  <E>(error: E) =>
  <T>(option: Option<T>): Result<T, E> =>
    isSome(option)
      ? ok(option.content)
      : err(error);

/**
 * Functor instance for Option.
 * Maps functions over optional values.
 * @internal
 */
export const optionFunctor: Functor1<"Option"> = {
  KindKey: "Option",
  map:
    <A, B>(f: (a: A) => B) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa)
        ? some<B>(f(fa.content))
        : none(),
};
export const { map: mapOption } = optionFunctor;

/**
 * Apply instance for Option.
 * Applies wrapped functions to wrapped values.
 * @internal
 */
export const optionApply: Apply1<"Option"> = {
  ...optionFunctor,
  ap:
    <A, B>(fab: Option<(a: A) => B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fab)
        ? isSome(fa)
          ? some<B>(fab.content(fa.content))
          : none()
        : none(),
};
export const { ap: applyOption } = optionApply;

/**
 * Pointed instance for Option.
 * Wraps values in Some context.
 * @internal
 */
export const optionPointed: Pointed1<"Option"> = {
  ...optionFunctor,
  of: <A>(a: A): Option<A> => some<A>(a),
};
export const { of: ofOption } = optionPointed;

/**
 * Applicative instance for Option.
 * @internal
 */
export const optionApplicative: Applicative1<"Option"> =
  {
    ...optionApply,
    ...optionFunctor,
    ...optionPointed,
  };

/**
 * Chain instance for Option.
 * Chains operations that return Options.
 * @internal
 */
export const optionChain: Chain1<"Option"> = {
  ...optionFunctor,
  ...optionApply,
  ...optionPointed,
  chain:
    <A, B>(f: (a: A) => Option<B>) =>
    (fa: Option<A>): Option<B> =>
      isSome(fa) ? f(fa.content) : none(),
};
export const { chain: chainOption } = optionChain;

/**
 * Monad instance for Option.
 * @internal
 */
export const optionMonad: Monad1<"Option"> = {
  ...optionApplicative,
  ...optionChain,
};
