import {
  Result,
  ok,
  err,
  pipe,
  matchResult,
} from "plgg";

/**
 * Errors and values of a batch of accumulated
 * results, kept separately.
 */
export type Partitioned<A, E> = Readonly<{
  errors: ReadonlyArray<E>;
  values: ReadonlyArray<A>;
}>;

/**
 * Splits error-accumulating results into all their
 * errors and all their values — the primitive behind
 * every "check everything, report everything" pass
 * (design.md §35: one run surfaces every diagnostic,
 * not just the first).
 */
export const partitionResults = <A, E>(
  results: ReadonlyArray<
    Result<A, ReadonlyArray<E>>
  >,
): Partitioned<A, E> => ({
  errors: results.flatMap((r) =>
    pipe(
      r,
      matchResult(
        (es: ReadonlyArray<E>) => es,
        (): ReadonlyArray<E> => [],
      ),
    ),
  ),
  values: results.flatMap((r) =>
    pipe(
      r,
      matchResult(
        (): ReadonlyArray<A> => [],
        (v: A): ReadonlyArray<A> => [v],
      ),
    ),
  ),
});

/**
 * Folds accumulated results into one: every value when
 * nothing failed, otherwise every error together.
 */
export const allOrErrors = <A, E>(
  results: ReadonlyArray<
    Result<A, ReadonlyArray<E>>
  >,
): Result<ReadonlyArray<A>, ReadonlyArray<E>> =>
  pipe(
    partitionResults(results),
    (p: Partitioned<A, E>) =>
      p.errors.length === 0
        ? ok(p.values)
        : err(p.errors),
  );
