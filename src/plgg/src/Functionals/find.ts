import { Result, ok, err } from "plgg/index";

/**
 * Finds the first element in an array that satisfies a predicate function.
 * Returns Ok with the found element or Err if no element matches.
 *
 * Can accept either:
 * - A predicate function directly
 * - An object with predicate and optional errMessage properties
 *
 * Supports type guards for narrowing the result type.
 */
export function find<T, S extends T>(
  arg:
    | ((element: T) => element is S)
    | {
        predicate: (element: T) => element is S;
        errMessage?: string;
      },
): (arr: ReadonlyArray<T>) => Result<S, Error>;

export function find<T>(
  arg:
    | ((element: T) => boolean)
    | {
        predicate: (element: T) => boolean;
        errMessage?: string;
      },
): (arr: ReadonlyArray<T>) => Result<T, Error>;

export function find<T>(
  arg:
    | ((element: T) => boolean)
    | {
        predicate: (element: T) => boolean;
        errMessage?: string;
      },
): (arr: ReadonlyArray<T>) => Result<T, Error> {
  const predicate =
    typeof arg === "function"
      ? arg
      : arg.predicate;
  const errMessage =
    typeof arg === "function"
      ? "No element found matching the predicate"
      : (arg.errMessage ??
        "No element found matching the predicate");

  return (
    arr: ReadonlyArray<T>,
  ): Result<T, Error> => {
    const found = arr.find(predicate);
    if (found === undefined) {
      return err(new Error(errMessage));
    }
    return ok(found);
  };
}
