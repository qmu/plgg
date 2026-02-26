/**
 * Filters an array using a predicate, properly narrowing the return type.
 *
 * Unlike the built-in Array.prototype.filter, this function correctly narrows
 * the type when used with user-defined type guards.
 *
 * Supports type guards for narrowing the result type.
 *
 * @example
 * ```typescript
 * const items: Array<string | number> = [1, "hello", 2, "world"];
 * const strings = pipe(
 *   items,
 *   filter((x): x is string => typeof x === "string")
 * );
 * // strings is properly typed as ReadonlyArray<string>
 * ```
 */
export function filter<T, S extends T>(
  predicate: (element: T) => element is S,
): (arr: ReadonlyArray<T>) => ReadonlyArray<S>;

export function filter<T>(
  predicate: (element: T) => boolean,
): (arr: ReadonlyArray<T>) => ReadonlyArray<T>;

export function filter<T>(
  predicate: (element: T) => boolean,
): (arr: ReadonlyArray<T>) => ReadonlyArray<T> {
  return (arr: ReadonlyArray<T>): ReadonlyArray<T> =>
    arr.filter(predicate);
}
