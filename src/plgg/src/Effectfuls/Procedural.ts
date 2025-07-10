import { DomainError, Result, ok, err } from "plgg/index";

/**
 * Async Result type for Plgg operations.
 */
export type Procedural<T, E = DomainError> = Promise<Result<T, E>>;

/**
 * Creates successful Procedural.
 */
export const success = <T, E = DomainError>(value: T): Procedural<T, E> =>
  Promise.resolve(ok(value));

/**
 * Creates failed Procedural.
 */
export const fail = <T, E = DomainError>(error: E): Procedural<T, E> =>
  Promise.resolve(err(error));
