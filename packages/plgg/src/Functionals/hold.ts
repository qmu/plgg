/**
 * Simple function composition utility.
 */
export const hold =
  <T, U>(fn: (x: T) => U) =>
  (x: T) =>
    fn(x);
