import { Result } from "plgg/index";
import { collectResults } from "plgg/Functionals/collectResults";

/**
 * Applies function to each element, collecting all results or errors.
 */
export const conclude =
  <T, U, F>(fn: (item: T) => Result<U, F>) =>
  (
    vec: ReadonlyArray<T>,
  ): Result<ReadonlyArray<U>, ReadonlyArray<F>> =>
    collectResults(vec.map(fn));
