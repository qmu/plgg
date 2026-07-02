import { Ordering } from "plgg/index";

/**
 * Primitive total order over the language-
 * comparable scalars (those where `<`/`>` are
 * well-defined): `string`, `number`, `bigint`.
 */
export const compare = <
  T extends string | number | bigint,
>(
  a: T,
  b: T,
): Ordering => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Derives an {@link Ordering} by projecting each
 * value to a comparable key — the data-last way
 * to order records by a field.
 */
export const comparing =
  <T, K extends string | number | bigint>(
    key: (t: T) => K,
  ) =>
  (a: T, b: T): Ordering =>
    compare(key(a), key(b));

/**
 * Non-mutating sort: copies the input before
 * sorting so the argument array is untouched.
 */
export const sortBy =
  <T>(cmp: (a: T, b: T) => Ordering) =>
  (xs: ReadonlyArray<T>): ReadonlyArray<T> =>
    [...xs].sort(cmp);
