import { Result } from "plgg/index";

/**
 * Type for values that may or may not be Promises.
 */
export type PossiblyPromise<T> = Promise<T> | T;

/**
 * Type for values that can be direct values or Results.
 */
export type PossiblyResult<T, U> =
  | Result<T, U>
  | T;

/**
 * Async Result type for Plgg operations.
 */
export type Procedural<
  T,
  U extends Error = Error,
> = T extends never
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
