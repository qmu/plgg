import { Monad2 } from "plgg/TypeLevels";

/**
 * Ok side of Result, typically representing a success value.
 */
export type Ok<T> = {
  _tag: "Ok";
  ok: T;
};

/**
 * Err side of Result, typically representing an error.
 */
export type Err<F> = {
  _tag: "Err";
  err: F;
};

/**
 * Result type for functional error handling.
 * @template T - The success type
 * @template F - The failure type
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Type guard to check if a value is a Result.
 */
export const isResult = <T, F>(e: unknown): e is Result<T, F> =>
  typeof e === "object" &&
  e !== null &&
  "_tag" in e &&
  (e._tag === "Ok" || e._tag === "Err");

/**
 * Creates an Ok instance.
 */
export const ok = <T, F = never>(a: T): Result<T, F> =>
  ({
    _tag: "Ok",
    ok: a,
  }) as const;

/**
 * Creates an Err instance.
 */
export const err = <F, T = never>(e: F): Result<T, F> =>
  ({
    _tag: "Err",
    err: e,
  }) as const;

/**
 * Type guard to check if a Result is an Ok.
 */
export const isOk = <T, F>(e: unknown): e is Ok<T> =>
  isResult<T, F>(e) && e._tag === "Ok";

/**
 * Type guard to check if a Result is an Err.
 */
export const isErr = <T, F>(e: unknown): e is Err<F> =>
  isResult<T, F>(e) && e._tag === "Err";

declare module "plgg/TypeLevels/Kind" {
  export interface KindKeytoKind2<A, B> {
    Result: Result<A, B>;
  }
}

export const {
  map: mapResult,
  ap: applyResult,
  of: ofResult,
  chain: chainResult,
}: Monad2<"Result"> = {
  KindKey: "Result",

  // Functor2: map
  map:
    <A, B, C>(f: (a: A) => B) =>
    (fa: Result<A, C>): Result<B, C> =>
      isOk(fa) ? ok<B, C>(f(fa.ok)) : fa,

  // Apply2: ap
  ap:
    <A, B, C>(fab: Result<(a: A) => B, C>) =>
    (fa: Result<A, C>): Result<B, C> =>
      isOk(fab) ? (isOk(fa) ? ok<B, C>(fab.ok(fa.ok)) : fa) : fab,

  // Pointed2: of
  of: <A = never, B = never>(a: A): Result<A, B> => ok<A, B>(a),

  // Chain2: chain
  chain:
    <A, B, C>(f: (a: A) => Result<B, C>) =>
    (fa: Result<A, C>): Result<B, C> =>
      isOk(fa) ? f(fa.ok) : fa,
};
