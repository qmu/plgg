import {
  isOk,
  isErr,
  fail,
  Result,
  MaybePromise,
  Procedural,
  DomainError,
  success,
} from "plgg/index";

/**
 * Maps Result success value with function.
 */
export const mapOk =
  <T, U, F = Error>(fn: (value: T) => MaybePromise<Result<U, F>>) =>
  async (result: Result<T, F>): Promise<Result<U, F>> =>
    isOk(result) ? await fn(result.ok) : result;

/**
 * Maps Result error value with function.
 */
export const mapErr =
  <T, U, F = Error>(fn: (error: F) => MaybePromise<Result<T, U>>) =>
  async (result: Result<T, F>): Promise<Result<T, U>> =>
    isOk(result) ? result : await fn(result.err);

/*
 * Maps Procedural success value with function.
 */
export const mapProcOk =
  <T, U, F = DomainError.t>(fn: (value: T) => Procedural<U, F>) =>
  async (plgg: Procedural<T, F>): Procedural<U, F> => {
    const result = await plgg;
    return isOk(result) ? await fn(result.ok) : result;
  };

/*
 * Maps Procedural error value with function.
 */
export const mapProcErr =
  <T, U, F = DomainError.t>(fn: (error: F) => Procedural<T, U>) =>
  async (plgg: Procedural<T, F>): Procedural<T, U> => {
    const result = await plgg;
    return isOk(result) ? result : await fn(result.err);
  };

/*
 * Transforms Procedural error into new error type.
 */
export const capture =
  <T, E1 extends DomainError.t, E2 extends DomainError.t>(
    f: (error: E1) => E2,
  ) =>
  async (plgg: Procedural<T, E1>): Procedural<T, E2> => {
    const result = await plgg;
    return isErr(result) ? fail(f(result.err)) : result;
  };

/**
 * Lifts a synchronous function into a Procedural context.
 */
export const lift =
  <T, U>(f: (a: T) => U) =>
  (a: T): Procedural<U> =>
    success(f(a));

/**
 * Handles a Procedural value, executing a function on error.
 */
export const handle = async <T, E extends DomainError.t>(
  value: Procedural<T, E>,
  onError: (p: E) => E,
): Procedural<T> => {
  const result = await value;
  return isErr(result) ? fail(onError(result.err)) : value;
};
