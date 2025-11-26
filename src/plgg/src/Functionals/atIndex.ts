import {
  Result,
  InvalidError,
  ok,
  err,
} from "plgg/index";

/**
 * Accesses an element from an array at a specific index in a proc-friendly way.
 * Returns Ok with the element at the index or Err if the index is out of bounds.
 */
export const atIndex =
  (index: number) =>
  (
    arr: unknown,
  ): Result<unknown, InvalidError> => {
    if (
      !Array.isArray(arr) ||
      index < 0 ||
      index >= arr.length
    ) {
      return err(
        new InvalidError({
          message: `Cannot access index ${index}`,
        }),
      );
    }
    return ok(arr[index]);
  };
