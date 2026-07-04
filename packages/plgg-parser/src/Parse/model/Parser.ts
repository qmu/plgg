import { Result, InvalidError } from "plgg";
import { ParseState } from "plgg-parser/Parse/model/ParseState";
import { Parsed } from "plgg-parser/Parse/model/Parsed";

/**
 * A parser as **pure data**: a data-last function from a
 * {@link ParseState} to either a {@link Parsed} success or
 * an {@link InvalidError} failure. Not a class, not a
 * chaining builder — combinators are standalone functions
 * that take and return `Parser`s, composed with `pipe` and
 * `flow` exactly like plgg's `cast`/`proc` steps.
 *
 * Failure carries no state, so backtracking is automatic:
 * whoever holds the pre-attempt `ParseState` and receives an
 * `Err` still owns that state and can try another branch.
 * That is why {@link or}, {@link optional}, and {@link many}
 * backtrack without any explicit `attempt` marker.
 */
export type Parser<A, S> = (
  state: ParseState<S>,
) => Result<Parsed<A, S>, InvalidError>;
