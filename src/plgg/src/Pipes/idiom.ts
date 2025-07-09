import {
  isOk,
  isErr,
  fail,
  Result,
  MaybePromise,
  Procedural,
  DomainError,
  success,
  pipe,
  ok,
  err,
} from "plgg/index";

/**
 * Maps Result success value with function, leaving errors unchanged.
 */
export const mapOk =
  <T, U, F = Error>(fn: (value: T) => Result<U, F>) =>
  (result: Result<T, F>): Result<U, F> =>
    isOk(result) ? fn(result.ok) : result;

/**
 * Maps Result error value with function, leaving success values unchanged.
 */
export const mapErr =
  <T, U, F = Error>(fn: (error: F) => Result<T, U>) =>
  (result: Result<T, F>): Result<T, U> =>
    isOk(result) ? result : fn(result.err);

/**
 * Pattern matches on a Result, applying the appropriate function based on the variant.
 * This enables handling both success and error cases in a type-safe way.
 */
export const mapResult =
  <T, U, F = Error>(
    onOk: (value: T) => Result<U, F>,
    onErr: (error: F) => Result<U, F>,
  ) =>
  (result: Result<T, F>): Result<U, F> =>
    isOk(result) ? onOk(result.ok) : onErr(result.err);

/**
 * Maps Result success value with async function, leaving errors unchanged.
 */
export const mapMaybeOk =
  <T, U, F = Error>(fn: (value: T) => MaybePromise<Result<U, F>>) =>
  async (result: Result<T, F>): Promise<Result<U, F>> =>
    isOk(result) ? await fn(result.ok) : result;

/**
 * Maps Result error value with async function, leaving success values unchanged.
 */
export const mapMaybeErr =
  <T, U, F = Error>(fn: (error: F) => MaybePromise<Result<T, U>>) =>
  async (result: Result<T, F>): Promise<Result<T, U>> =>
    isOk(result) ? result : await fn(result.err);

/**
 * Pattern matches on a Result, applying the appropriate async function based on the variant.
 * This enables handling both success and error cases in a type-safe way.
 */
export const mapMaybeResult =
  <T, U, F = Error>(
    onOk: (value: T) => MaybePromise<Result<U, F>>,
    onErr: (error: F) => MaybePromise<Result<U, F>>,
  ) =>
  async (result: Result<T, F>): Promise<Result<U, F>> =>
    isOk(result) ? await onOk(result.ok) : await onErr(result.err);

/**
 * Maps Procedural success value with function.
 * If the Procedural is successful, applies the function to the success value.
 */
export const mapProcOk =
  <T, U, F = DomainError.t>(fn: (value: T) => Procedural<U, F>) =>
  async (plgg: Procedural<T, F>): Procedural<U, F> => {
    const result = await plgg;
    return isOk(result) ? await fn(result.ok) : result;
  };

/**
 * Maps Procedural error value with function.
 * If the Procedural is an error, applies the function to the error value.
 */
export const mapProcErr =
  <T, U, F = DomainError.t>(fn: (error: F) => Procedural<T, U>) =>
  async (plgg: Procedural<T, F>): Procedural<T, U> => {
    const result = await plgg;
    return isOk(result) ? result : await fn(result.err);
  };

/**
 * Transforms Procedural error into new error type.
 * Captures and transforms errors while preserving success values.
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

/**
 * Executes a side effect function on the success value of a Result without changing the Result.
 * Useful for logging, debugging, or other side effects.
 */
export const tap =
  <T, F = Error>(fn: (value: Result<T, F>) => void) =>
  (result: Result<T, F>): Result<T, F> => {
    fn(result);
    return result;
  };

/**
 * Executes a side effect function on the success value of a Procedural without changing the Procedural.
 * Useful for logging, debugging, or other side effects.
 */
export const tapProc =
  <T, F = DomainError.t>(fn: (value: T) => void) =>
  async (plgg: Procedural<T, F>): Procedural<T, F> => {
    const result = await plgg;
    if (isOk(result)) {
      fn(result.ok);
    }
    return result;
  };

/**
 * Encodes data as formatted JSON string.
 */
export const jsonEncode = (data: unknown): string =>
  JSON.stringify(data, null, 2);

/**
 * Decodes JSON string or Buffer into unknown value, returning Result.
 */
export const jsonDecode = (json: string | Buffer): Result<unknown, Error> =>
  pipe(
    json,
    tryCatch(
      (json) =>
        JSON.parse(Buffer.isBuffer(json) ? json.toString("utf-8") : json),
      (error) => toError(error),
    ),
  );

/**
 * Converts unknown error to Error instance.
 */
export const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err));

/**
 * Wraps a function to catch exceptions and return Result.
 */
export const tryCatch =
  <T, U, E = Error>(
    fn: (arg: T) => U,
    errorHandler: (error: unknown) => E = (error: unknown) => {
      if (error instanceof Error) {
        return new Error(`Operation failed: ${error.message}`) as unknown as E;
      }
      return new Error("Unexpected error occurred") as unknown as E;
    },
  ) =>
  (arg: T): Result<U, E> => {
    try {
      return ok(fn(arg));
    } catch (error: unknown) {
      return err(errorHandler(error));
    }
  };
