/**
 * Type for values that may or may not be Promises.
 */
export type MaybePromise<T> = T | Promise<T>;

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
