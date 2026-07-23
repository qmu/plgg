/**
 * The result of a total-order comparison: `-1`
 * (less), `0` (equal), `1` (greater). Narrow on
 * purpose so callers can `match`/branch on it
 * rather than an opaque `number`.
 */
export type Ordering = -1 | 0 | 1;

/**
 * Enables a total ordering over values of `T`.
 */
export interface Comparable<T> {
  /**
   * Compares two `T` values, returning their
   * {@link Ordering}.
   */
  compare: (a: T, b: T) => Ordering;
}
