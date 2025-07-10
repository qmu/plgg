/**
 * Type for values that may or may not be Promises.
 */
export type MaybePromise<T> = T | Promise<T>;

export const isPromise = <T>(value: MaybePromise<T>): value is Promise<T> =>
  value instanceof Promise ||
  (typeof value === "object" && value !== null && "then" in value);
