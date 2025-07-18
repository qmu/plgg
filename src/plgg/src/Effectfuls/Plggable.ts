import { Result, ok, err, MaybePromise } from "plgg/index";

/**
 * Async Result type for Plgg operations.
 */
export type Plggable<T, E extends Error = Error> = MaybePromise<
  Result<T, E> | T
>;

/**
 * Creates successful Plggable.
 */
export const success = <T, E extends Error = Error>(value: T): Plggable<T, E> =>
  Promise.resolve(ok(value));

/**
 * Creates failed Plggable.
 */
export const fail = <T, E extends Error = Error>(error: E): Plggable<T, E> =>
  Promise.resolve(err(error));
