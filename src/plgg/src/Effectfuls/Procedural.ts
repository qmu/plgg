import { Result, ok, err, MaybePromise } from "plgg/index";

/**
 * Async Result type for Plgg operations.
 */
export type Procedural<T, E extends Error = Error> = MaybePromise<
  Result<T, E> | T
>;

/**
 * Creates successful Procedural.
 */
export const success = <T, E extends Error = Error>(
  value: T,
): Procedural<T, E> => Promise.resolve(ok(value));

/**
 * Creates failed Procedural.
 */
export const fail = <T, E extends Error = Error>(error: E): Procedural<T, E> =>
  Promise.resolve(err(error));
