import { Result } from "plgg/index";

/**
 * Type for values that may or may not be Promises.
 */
export type MaybePromise<T> = Promise<T> | T;

/**
 *
 */
export type MaybeResult<T, U> = Result<T, U> | T;

/**
 * Async Result type for Plgg operations.
 */
export type Plggable<T, U extends Error = Error> = T extends never
  ? never
  : MaybePromise<MaybeResult<T, U>>;

/**
 * Type guard to check if a value is a Promise.
 * Checks both instanceof Promise and thenable objects.
 */
export const isPromise = <T>(value: MaybePromise<T>): value is Promise<T> =>
  value instanceof Promise ||
  (typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function");
