import { PlggError, Result, ok, err } from "@plgg/index";

/**
 * Async Result type for Plgg operations.
 */
export type Procedural<T, E = PlggError.t> = Promise<Result<T, E>>;

/**
 * Creates successful Procedural.
 */
export const success = <T, E = PlggError.t>(value: T): Procedural<T, E> =>
  Promise.resolve(ok(value));

/**
 * Creates failed Procedural.
 */
export const fail = <T, E = PlggError.t>(error: E): Procedural<T, E> =>
  Promise.resolve(err(error));
