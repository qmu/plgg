import { Monad2 } from "plgg/TypeLevels";
import { ParametricVariant, hasTag, variantMaker } from "plgg/Effectfuls";

const okTag = "Ok" as const;
const errTag = "Err" as const;

/**
 * Ok side of Result, representing a successful computation.
 * Contains the success value in the content property.
 * 
 * @template T - Type of the success value
 */
export type Ok<T> = ParametricVariant<typeof okTag, T>;

/**
 * Err side of Result, representing a failed computation.
 * Contains the error value in the content property.
 * 
 * @template F - Type of the error value
 */
export type Err<F> = ParametricVariant<typeof errTag, F>;

/**
 * Result type for functional error handling.
 * Represents either a successful value (Ok) or an error (Err).
 * Provides a safe way to handle operations that might fail.
 * 
 * @template T - Type of the success value
 * @template F - Type of the error value
 * @example
 * const divide = (a: number, b: number): Result<number, string> =>
 *   b === 0 ? err("Division by zero") : ok(a / b);
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Creates an Ok instance containing a success value.
 * 
 * @param a - The success value to wrap
 * @returns Ok variant containing the value
 * @example
 * const success = ok(42); // Ok<number>
 */
export const ok = <T>(a: T): Ok<T> => variantMaker(okTag)<Ok<T>>()(a);

/**
 * Creates an Err instance containing an error value.
 * 
 * @param e - The error value to wrap
 * @returns Err variant containing the error
 * @example
 * const error = err("Something went wrong"); // Err<string>
 */
export const err = <F>(e: F): Err<F> => variantMaker(errTag)<Err<F>>()(e);

/**
 * Type guard to check if a Result is an Ok.
 * 
 * @param e - Value to check
 * @returns True if the value is an Ok, false otherwise
 * @example
 * if (isOk(result)) {
 *   console.log(result.content); // TypeScript knows this is the success value
 * }
 */
export const isOk = <T>(e: unknown): e is Ok<T> => hasTag(okTag)(e);

/**
 * Type guard to check if a Result is an Err.
 * 
 * @param e - Value to check
 * @returns True if the value is an Err, false otherwise
 * @example
 * if (isErr(result)) {
 *   console.error(result.content); // TypeScript knows this is the error value
 * }
 */
export const isErr = <F>(e: unknown): e is Err<F> => hasTag(errTag)(e);

/**
 * Type guard to check if a value is a Result (either Ok or Err).
 * 
 * @param e - Value to check
 * @returns True if the value is a Result, false otherwise
 * @example
 * if (isResult(value)) {
 *   // TypeScript knows value is Result<T, F>
 * }
 */
export const isResult = <T, F>(e: unknown): e is Result<T, F> =>
  isOk<T>(e) || isErr<F>(e);

declare module "plgg/TypeLevels/Kind" {
  export interface KindKeytoKind2<A, B> {
    Result: Result<A, B>;
  }
}

/**
 * Monad instance for Result providing map, ap, of, and chain operations.
 * Exported as individual functions for convenient use.
 */
export const {
  /** Maps a function over the success value of a Result */
  map: mapResult,
  /** Applies a wrapped function to a wrapped value */
  ap: applyResult,
  /** Wraps a value in a successful Result */
  of: ofResult,
  /** Monadic bind operation for Result */
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
