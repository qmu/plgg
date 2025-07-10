import {
  isOk,
  isErr,
  Result,
  MaybePromise,
  Procedural,
  success,
  pipe,
  ok,
  err,
  ValidationError,
  isResult,
  isPromise,
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
export const mapOkAsync =
  <T, U, F = Error>(fn: (value: T) => MaybePromise<Result<U, F>>) =>
  async (result: Result<T, F>): Promise<Result<U, F>> =>
    isOk(result) ? await fn(result.ok) : result;

/**
 * Maps Result error value with async function, leaving success values unchanged.
 */
export const mapErrAsync =
  <T, U, F = Error>(fn: (error: F) => MaybePromise<Result<T, U>>) =>
  async (result: Result<T, F>): Promise<Result<T, U>> =>
    isOk(result) ? result : await fn(result.err);

/**
 * Pattern matches on a Result, applying the appropriate async function based on the variant.
 * This enables handling both success and error cases in a type-safe way.
 */
export const mapResultAsync =
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
  <T, U, F extends Error = Error>(fn: (value: T) => Procedural<U, F>) =>
  (value: Procedural<T, F>): Procedural<U, F> => {
    if (isPromise(value)) {
      return value.then((result) => {
        if (isResult(result)) {
          return isOk(result) ? fn(result.ok) : result;
        }
        return fn(result);
      });
    }
    if (isResult(value)) {
      return isOk(value) ? fn(value.ok) : value;
    }
    return fn(value);
  };

/**
 * Maps Procedural error value with function.
 * If the Procedural is an error, applies the function to the error value.
 */
export const mapProcErr =
  <T, U extends Error, F extends Error = Error>(
    fn: (error: F) => Procedural<T, U>,
  ) =>
  (value: Procedural<T, F>): Procedural<T, U> => {
    if (isPromise(value)) {
      return value.then((result) => {
        if (isResult(result)) {
          return isErr(result) ? fn(result.err) : result;
        }
        return result;
      });
    }
    if (isResult(value)) {
      return isOk(value) ? value : fn(value.err);
    }
    return value;
  };

/**
 * Lifts a synchronous function into a Procedural context.
 */
export const lift =
  <T, U>(f: (a: T) => U) =>
  (a: T): Procedural<U> =>
    success(f(a));

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

export const tryCatchAsync =
  <T, U, E = Error>(
    fn: (arg: T) => MaybePromise<U>,
    errorHandler: (error: unknown) => E = (error: unknown) => {
      if (error instanceof Error) {
        return new Error(`Operation failed: ${error.message}`) as unknown as E;
      }
      return new Error("Unexpected error occurred") as unknown as E;
    },
  ) =>
  async (arg: T): Promise<Result<U, E>> => {
    try {
      return ok(await fn(arg));
    } catch (error: unknown) {
      return err(errorHandler(error));
    }
  };

export const defined = <T>(value: T | undefined): Result<T, Error> =>
  value === undefined ? err(new Error("Value is undefined")) : ok(value);

export function unreachable(): never {
  throw new Error("Supposed to be unreachable");
}

/*
 * Branching flow that preserves input/output types
 * Selects between two functions based on predicate
 */
export const ifElse =
  <T, U>(
    predicate: PredicateFunction<T>,
    ifTrue: OptionFunction<T, U>,
    ifFalse: OptionFunction<T, U>,
  ) =>
  (value: T): U =>
    predicate(value) ? ifTrue(value) : ifFalse(value);

type OptionFunction<T, U = T> = (x: T) => U;
type PredicateFunction<T> = (x: T) => boolean;

export const refine =
  <T>(predicate: (arg: T) => boolean, errMessage?: string) =>
  (a: T): Result<T, ValidationError> =>
    predicate(a)
      ? ok(a)
      : err(
          new ValidationError({
            message: errMessage
              ? errMessage
              : `The string ${a} is not valid according to the predicate`,
          }),
        );
