import {
  Result,
  PromisedResult,
  Defect,
  err,
  defect,
  isPromise,
} from "plgg/index";

/**
 * Acquire a resource, run `use` on it, and **always** release it — on `Ok`,
 * on `Err`, and on a throw/reject — without dropping the errors-as-values body
 * back into `try/finally`. `use`'s `Result` is returned as-is; a throw (sync)
 * or reject (async) in `use` becomes a {@link Defect} so the whole scope stays
 * a single `Result`. `release` runs exactly once, after `use` settles.
 *
 * `acquire` runs first and outside the guarded region: if it throws, there is
 * no resource and `release` is never called. To let acquisition fail as a
 * value, have `acquire` hand back a resource that carries its own error and
 * branch inside `use`.
 *
 * Async when `use` returns a {@link PromisedResult} (then `release` may be
 * async and is awaited before the scope resolves), sync when `use` returns a
 * plain {@link Result}. Mirrors {@link tryCatch}'s sync/async duality — the
 * async overload is listed first so a `Promise`-returning `use` matches it.
 */
// Async: `use` returns a PromisedResult; `release` may be async.
function bracket<R, T, E>(
  acquire: () => R,
  use: (resource: R) => PromisedResult<T, E>,
  release: (
    resource: R,
  ) => void | Promise<void>,
): PromisedResult<T, E | Defect>;
// Sync: `use` returns a Result; `release` is synchronous.
function bracket<R, T, E>(
  acquire: () => R,
  use: (resource: R) => Result<T, E>,
  release: (resource: R) => void,
): Result<T, E | Defect>;
// Implementation
function bracket<R, T, E>(
  acquire: () => R,
  use: (
    resource: R,
  ) => Result<T, E> | PromisedResult<T, E>,
  release: (
    resource: R,
  ) => void | Promise<void>,
):
  | Result<T, E | Defect>
  | PromisedResult<T, E | Defect> {
  const resource = acquire();
  // The primitive that provides the teardown guarantee: `try/catch` around a
  // possibly-throwing `use` is irreducible here, exactly as in `tryCatch`.
  // The async path wires `release` into the settled promise (a synchronous
  // `finally` would run before `use` resolves), so both channels release.
  try {
    const used = use(resource);
    return isPromise(used)
      ? used.then(
          (
            settled: Result<T, E>,
          ): PromisedResult<T, E | Defect> =>
            Promise.resolve(release(resource)).then(
              () => settled,
            ),
          (
            error: unknown,
          ): PromisedResult<T, E | Defect> =>
            Promise.resolve(release(resource)).then(
              () =>
                err(
                  defect(
                    "bracket: `use` rejected",
                    error,
                  ),
                ),
            ),
        )
      : ((): Result<T, E | Defect> => {
          release(resource);
          return used;
        })();
  } catch (error: unknown) {
    release(resource);
    return err(
      defect("bracket: `use` threw", error),
    );
  }
}

export { bracket };
