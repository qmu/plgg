/**
 * Ok side of Result, typically representing a success value.
 */
export type Ok<T> = {
  _tag: "Ok";
  ok: T;
};

/**
 * Err side of Result, typically representing an error.
 */
export type Err<F> = {
  _tag: "Err";
  err: F;
};

/**
 * Result type for functional error handling.
 * @template T - The success type
 * @template F - The failure type
 */
export type Result<T, F> = Ok<T> | Err<F>;

/**
 * Type guard to check if a value is a Result.
 */
export const isResult = <T, F>(e: unknown): e is Result<T, F> =>
  typeof e === "object" &&
  e !== null &&
  "_tag" in e &&
  (e._tag === "Ok" || e._tag === "Err");

/**
 * Creates an Ok instance.
 */
export const ok = <T, F = never>(a: T): Result<T, F> => {
  const result = {
    _tag: "Ok" as const,
    ok: a,
  };
  return result;
};

/**
 * Creates an Err instance.
 */
export const err = <F, T = never>(e: F): Result<T, F> => {
  const result = {
    _tag: "Err" as const,
    err: e,
  };
  return result;
};

/**
 * Type guard to check if a Result is an Ok.
 */
export const isOk = <T, F>(e: Result<T, F>): e is Ok<T> => e._tag === "Ok";

/**
 * Type guard to check if a Result is an Err.
 */
export const isErr = <T, F>(e: Result<T, F>): e is Err<F> => e._tag === "Err";
