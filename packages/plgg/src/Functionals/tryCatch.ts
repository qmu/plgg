import {
  Result,
  Defect,
  ok,
  err,
  defect,
  isPromise,
} from "plgg/index";

/**
 * Wraps a function so a thrown value becomes a `Result` instead of an
 * exception. With no `errorHandler` the thrown value is normalized to a
 * {@link Defect} (the model's bottom for an unexpected throw); a custom handler
 * maps the caught `unknown` to any error type `E`.
 *
 * The async overloads are listed first so a `Promise`-returning `fn` matches
 * them (a sync `fn`'s return is not assignable to `Promise<U>`, so it falls
 * through to the sync overloads) — otherwise `(arg) => U` would greedily match
 * an async `fn` with `U = Promise<…>` and never flatten.
 */
// Async, default error channel -> Defect
function tryCatch<T, U>(
  fn: (arg: T) => Promise<U>,
): (arg: T) => Promise<Result<U, Defect>>;
// Sync, default error channel -> Defect
function tryCatch<T, U>(
  fn: (arg: T) => U,
): (arg: T) => Result<U, Defect>;
// Async, custom error channel -> E
function tryCatch<T, U, E>(
  fn: (arg: T) => Promise<U>,
  errorHandler: (error: unknown) => E,
): (arg: T) => Promise<Result<U, E>>;
// Sync, custom error channel -> E
function tryCatch<T, U, E>(
  fn: (arg: T) => U,
  errorHandler: (error: unknown) => E,
): (arg: T) => Result<U, E>;
// Implementation
function tryCatch<T, U, E>(
  fn: (arg: T) => U | Promise<U>,
  errorHandler?: (error: unknown) => E,
): (
  arg: T,
) =>
  | Result<U, E | Defect>
  | Promise<Result<U, E | Defect>> {
  // `errorHandler(error)` is `E`; the fallback is a `Defect` — the union is
  // exact, so the implementation needs no cast.
  const handle = (
    error: unknown,
  ): E | Defect =>
    errorHandler
      ? errorHandler(error)
      : defect("Operation failed", error);
  return (arg: T) => {
    try {
      const result = fn(arg);
      return isPromise(result)
        ? result.then(
            (value): Result<U, E | Defect> =>
              ok(value),
            (error): Result<U, E | Defect> =>
              err(handle(error)),
          )
        : ok<U>(result);
    } catch (error: unknown) {
      return err(handle(error));
    }
  };
}

export { tryCatch };
