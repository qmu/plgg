import { Result } from "plgg/index";

/**
 * Type for values that may or may not be Promises.
 */
export type PossiblyPromise<T> = Promise<T> | T;

/**
 * Type for values that can be direct values or Results.
 * Uses [T] extends [never] to prevent distributive conditional types
 * which ensures union types like Operation work correctly with Result.
 */
export type PossiblyResult<T, U> = [T] extends [
  never,
]
  ? never
  : Result<T, U> | T;

/**
 * Async Result type for Plgg operations.
 * Uses [T] extends [never] to prevent distribution over union types.
 */
export type Procedural<
  T,
  U extends Error = Error,
> = [T] extends [never]
  ? never
  : PossiblyPromise<PossiblyResult<T, U>>;

/**
 * Type guard to check if a value is a Promise.
 */
export const isPromise = <T>(
  value: PossiblyPromise<T>,
): value is Promise<T> =>
  value instanceof Promise ||
  (typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function");
