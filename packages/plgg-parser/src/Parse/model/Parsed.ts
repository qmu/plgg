import { ParseState } from "plgg-parser/Parse/model/ParseState";

/**
 * A successful parse outcome: the produced `value` plus the
 * `state` advanced past what was consumed. The `state`
 * carries the position AND the threaded `userState`, so the
 * next combinator continues exactly where this one left off
 * with the same context.
 */
export type Parsed<A, S> = Readonly<{
  value: A;
  state: ParseState<S>;
}>;

/**
 * Builds a {@link Parsed}.
 */
export const parsed = <A, S>(
  value: A,
  state: ParseState<S>,
): Parsed<A, S> => ({ value, state });
