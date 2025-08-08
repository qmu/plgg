import { Result, ok, err, InvalidError, Monad1 } from "plgg/index";

/**
 * Array type with primitive values.
 * Readonly array that can contain any type of values.
 *
 * @template T - Type of array elements (defaults to unknown)
 */
export type Arr<T extends unknown = unknown> = ReadonlyArray<T>;

/**
 * Type guard for ReadonlyArray<unknown>.
 *
 * @param value - Value to check
 * @returns True if value is an array, false otherwise
 * @example
 * if (isArr(value)) {
 *   // TypeScript knows value is Arr
 * }
 */
export const isArr = (value: unknown): value is Arr => Array.isArray(value);

/**
 * Validates and casts unknown value to array.
 *
 * @param value - Value to validate and cast
 * @returns Result with array if valid, InvalidError if not
 * @example
 * const result = castArr([1, 2, 3]); // Ok([1, 2, 3])
 * const invalid = castArr("not array"); // Err(InvalidError)
 */
export const asArr = (value: unknown): Result<Arr, InvalidError> =>
  isArr(value)
    ? ok(value)
    : err(new InvalidError({ message: "Value is not an array" }));

/**
 * Validates that all array elements match a type predicate.
 * Returns a typed array if all elements pass the predicate.
 *
 * @param predicate - Type guard function to validate each element
 * @returns Function that validates arrays using the predicate
 * @example
 * const validateNumbers = every(isNum);
 * const result = validateNumbers([1, 2, 3]); // Ok([1, 2, 3])
 * const invalid = validateNumbers([1, "2", 3]); // Err(InvalidError)
 */
export const every =
  <T>(predicate: (value: unknown) => value is T) =>
  (value: Arr): Result<Arr<T>, InvalidError> =>
    value.every(predicate)
      ? ok(value)
      : err(
          new InvalidError({
            message: "Array elements do not match predicate",
          }),
        );

declare module "plgg/Theoriticals/Kind" {
  export interface KindKeytoKind1<A> {
    Arr: Arr<A>;
  }
}

/**
 * Monad instance for Arr providing map, ap, of, and chain operations.
 * Exported as individual functions for convenient use.
 */
export const {
  /** Maps a function over each element of an array */
  map: mapArr,
  /** Applies an array of functions to an array of values */
  ap: applyArr,
  /** Wraps a value in an array */
  of: ofArr,
  /** Monadic bind operation for arrays (flatMap) */
  chain: chainArr,
}: Monad1<"Arr"> = {
  KindKey: "Arr",

  // Functor1: map
  map:
    <T1, T2>(f: (a: T1) => T2) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.map(f),

  // Apply1: ap
  ap:
    <T1, T2>(fab: Arr<(a: T1) => T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fab.flatMap((f) => fa.map(f)),

  // Pointed1: of
  of: <T>(a: T): Arr<T> => [a],

  // Chain1: chain
  chain:
    <T1, T2>(f: (a: T1) => Arr<T2>) =>
    (fa: Arr<T1>): Arr<T2> =>
      fa.flatMap(f),
};
