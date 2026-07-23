import {
  Result,
  InvalidError,
  Option,
  ok,
  err,
  isOk,
  some,
  none,
  pipe,
  matchResult,
} from "plgg";
import { Parser } from "plgg-parser/Parse/model/Parser";
import {
  Parsed,
  parsed,
} from "plgg-parser/Parse/model/Parsed";
import { parseError } from "plgg-parser/Parse/model/ParseError";

/**
 * Ordered choice: try each alternative from the SAME
 * starting state and return the first success. When every
 * branch fails, the failure carries each branch's error as
 * an {@link InvalidError} `sibling`, so the diagnostic lists
 * why no alternative matched. Backtracking is automatic — a
 * failed branch returns no state, so the original is intact
 * for the next try.
 */
export const or =
  <A, S>(
    ...parsers: ReadonlyArray<Parser<A, S>>
  ): Parser<A, S> =>
  (state) => {
    // Imperative seam: probe alternatives left-to-right and
    // push each branch's error for sibling aggregation. A
    // reduce would rebuild the error array every step; a
    // local cursor + push accumulator, confined here, is the
    // documented exception to the no-let/no-loop rule.
    const errors: Array<InvalidError> = [];
    for (const parser of parsers) {
      const result = parser(state);
      if (isOk(result)) {
        return result;
      }
      errors.push(result.content);
    }
    return err(
      parseError(
        "no alternative matched",
        state.position,
        errors,
      ),
    );
  };

/**
 * Make a parser optional: its success becomes `Some`, its
 * failure becomes `None` at the original position (never
 * `null`, never a thrown error).
 */
export const optional =
  <A, S>(
    parser: Parser<A, S>,
  ): Parser<Option<A>, S> =>
  (state) =>
    pipe(
      parser(state),
      matchResult(
        (): Result<
          Parsed<Option<A>, S>,
          InvalidError
        > => ok(parsed(none(), state)),
        (
          p: Parsed<A, S>,
        ): Result<
          Parsed<Option<A>, S>,
          InvalidError
        > => ok(parsed(some(p.value), p.state)),
      ),
    );
