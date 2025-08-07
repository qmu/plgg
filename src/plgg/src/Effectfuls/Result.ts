import { Monad2 } from "plgg/TypeLevels";
import { ParametricVariant, hasTag, variantMaker } from "plgg/Effectfuls";

const okTag = "Ok" as const;
const errTag = "Err" as const;

/**
 * Ok side of Result, typically representing a success value.
 */
export type Ok<T> = ParametricVariant<typeof okTag, T>;

/**
 * Err side of Result, typically representing an error.
 */
export type Err<F> = ParametricVariant<typeof errTag, F>;

/**
 * Result type for functional error handling.
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Creates an Ok instance.
 */
export const ok = <T>(a: T): Ok<T> => variantMaker(okTag)<Ok<T>>()(a);

/**
 * Creates an Err instance.
 */
export const err = <F>(e: F): Err<F> => variantMaker(errTag)<Err<F>>()(e);

/**
 * Type guard to check if a Result is an Ok.
 */
export const isOk = <T>(e: unknown): e is Ok<T> => hasTag(okTag)(e);

/**
 * Type guard to check if a Result is an Err.
 */
export const isErr = <F>(e: unknown): e is Err<F> => hasTag(errTag)(e);

/**
 * Type guard to check if a value is a Result.
 */
export const isResult = <T, F>(e: unknown): e is Result<T, F> =>
  isOk<T>(e) || isErr<F>(e);

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
    <T1, T2, E>(f: (a: T1) => T2) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fa) ? ok<T2>(f(fa.content)) : fa,

  // Apply2: ap
  ap:
    <T1, T2, E>(fab: Result<(a: T1) => T2, E>) =>
    (fa: Result<T1, E>): Result<T2, E> =>
      isOk(fab) ? (isOk(fa) ? ok<T2>(fab.content(fa.content)) : fa) : fab,

  // Pointed2: of
  of: <T = never, E = never>(a: T): Result<T, E> => ok<T>(a),

  // Chain2: chain
  chain:
    <T1, T2, E1>(f: (a: T1) => Result<T2, E1>) =>
    <E2>(fa: Result<T1, E2>): Result<T2, E1 | E2> =>
      isOk(fa) ? f(fa.content) : fa,
};
